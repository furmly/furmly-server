const utils = require("./utils");
const express = require("express");
const debug = require("debug")("furmly-server:processors");
const ensureProcessorCanRunStandalone = require("./middlewares/ensureProcessorCanRunStandalone");
const verifyIfRequired = require("./middlewares/verifyIfRequired");
const createError = require("http-errors");
const furmlyEngine = require("../lib/furmly_engine");
const infrastructure = require("../lib/index");
const sendResponse = utils.sendResponse;
const async = require("async");
function setup(app, options) {
  // variables required by route.

  const createContext = utils.createContext;
  const processors = express.Router();
  const getObjectIdOrQuery = utils.getObjectIdOrQuery;
  const getDomain = utils.getDomain.bind(null, infrastructure);
  const verifyProcessorIfRequired = verifyIfRequired.bind(
    null,
    req => req.processor
  );
  const ensureHasProcessorClaim = utils.checkClaim.bind(
    null,
    infrastructure.constants.CLAIMS.PROCESSOR,
    utils.checkId,
    utils.checkIfClaimIsRequired
  );
  processors.param("id", function(req, res, next, id) {
    debug("fetching processor " + id);
    const query = getObjectIdOrQuery(furmlyEngine, id, { uid: id });
    debug(query);
    furmlyEngine.queryProcessor(
      query,
      {
        one: true
      },
      function(er, proc) {
        if (er)
          return next(
            createError(
              500,
              "An error occurred while fetching the processor",
              er
            )
          );

        if (!proc) return next(createError(404, "Could not find processor"));

        req.processor = proc;
        next();
      }
    );
  });

  processors.get("/upgrade", function(req, res, next) {
    furmlyEngine.queryLib({}, (er, libs) => {
      if (er) return next(createError(500, er));
      async.parallel(libs.map(x => x.save.bind(x)), er => {
        if (er) return next(createError(500, er));
        //successfully saved all libs
        furmlyEngine.queryProcessor({}, (er, ps) => {
          if (er) return next(createError(500, er));
          async.parallel(ps.map(x => x.save.bind(x)), er => {
            if (er) return next(createError(500, er));
            //successfully saved all processors
            return res.send({
              result: "successfully saved libraries and processors"
            });
          });
        });
      });
    });
  });

  processors.use("/run/:id", [
    ensureProcessorCanRunStandalone,
    verifyProcessorIfRequired,
    ensureHasProcessorClaim,
    function(req, res, next) {
      const send = () =>
        furmlyEngine.runProcessor(
          createContext(req),
          req.processor,
          sendResponse.bind(res, next)
        );

      if (req.user) {
        return getDomain(req.user.domain, req, er => {
          if (er)
            return next(
              createError(
                500,
                "Something went wrong while fetching domain info"
              ),
              er
            );
          send();
        });
      }
      send();
    }
  ]);
  app.use("/api/processors", [processors]);
}

module.exports = setup;
