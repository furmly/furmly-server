const debug = require("debug");
const async = require("async");
const createError = require("http-errors");
const utils = require("./utils");
const ensureProcessorCanRunStandalone = require("./middlewares/ensureProcessorCanRunStandalone");
const verify = require("./middlewares/verify");
const express = require("express");
const furmlyEngine = require("../lib/setup_furmly_engine");
const fileUpload = require("../lib/uploader");
const infrastructure = require("../lib/setup_infrastructure");
const config = require("../config");

function setup(app) {
  const getObjectIdOrQuery = utils.getObjectIdOrQuery;
  const getDomain = utils.getDomain;
  const VerificationOverride = utils.VerificationOverride;
  const createContext = utils.createContext;
  const downloadRouter = express.Router();

  const verifyDownloadAccess = req => {
    if (
      req.user ||
      (req.query._t0 &&
        (req.fileAccess = infrastructure.verifyScopedToken(
          "download",
          req.query._t0
        )))
    )
      return true;

    return false;
  };
  const processFileDownload = (res, next, er, data, description) => {
    if (er) return next(createError(400, er));

    debug(description);
    res.append("Content-Type", description.mime);
    res.append(
      "Content-Disposition",
      "attachment; filename=" + description.originalName
    );
    res.send(data);
  };
  const verifyProcessorAccessForDownload = (req, res, next) => {
    if (!req.query._t1 || !verifyDownloadAccess(req)) return false;
    let interval = config.get("download.processorTTL") || 5000;

    //its a processor based download.
    return !async.waterfall(
      [
        fn => {
          let id = req.params.id,
            query = getObjectIdOrQuery(id, { uid: id });
          furmlyEngine.queryProcessor(query, { one: true }, (er, processor) => {
            if (er) return fn(er);
            if (!processor)
              return fn(
                new Error("Sorry please confirm download link is correct")
              );
            //confirm if the object in the scopedtoken matches the id of the processor to run.
            if (
              !req.fileAccess ||
              (typeof req.fileAccess.data == "string" &&
                req.fileAccess.data !== id) ||
              (typeof req.fileAccess.data == "object" &&
                req.fileAccess.data.id !== id)
            )
              return fn(new Error("Processor in token does not match"));
            req.processor = processor;
            fn();
          });
        },

        //use timeouts because these functions dont properly support callback syntax.
        async.timeout(
          ensureProcessorCanRunStandalone.bind(null, req, res, next),
          interval
        )
      ],
      er => {
        //abondon etimeouts because its assumed the functions have sent the results.
        if (er && er.code == "ETIMEDOUT") return;
        if (er) return next(new createError.Unauthorized());

        return next();
      }
    );
  };

  downloadRouter.get("/:id", [
    verify.bind(
      new VerificationOverride((req, res, next) => {
        //verify using scoped token generator.
        if (verifyProcessorAccessForDownload(req, res, next)) return;
        if (verifyDownloadAccess(req)) return next();
        return next(new createError.Unauthorized());
      })
    ),
    function(req, res, next) {
      if (!req.query._t1)
        return fileUpload.readFile(
          req.params.id,
          req.fileAccess,
          processFileDownload.bind(this, res, next)
        );
      async.waterfall(
        [
          fn => {
            if (
              typeof req.fileAccess.data == "object" &&
              req.fileAccess.data.domain
            )
              return getDomain(req.fileAccess.data.domain, req, fn);
            fn();
          },
          fn => furmlyEngine.runProcessor(createContext(req), req.processor, fn)
        ],
        (er, result) => {
          if (er) return next(createError(400, er));
          if (!result || !result.id)
            return next(createError(400, "Processor returned no file"));

          fileUpload.readFile(
            result.id,
            result.user,
            processFileDownload.bind(this, res, next)
          );
        }
      );
    }
  ]);
  app.use("/api/download", [downloadRouter]);
}
module.exports = setup;
