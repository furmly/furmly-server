const utils = require("./utils");
const express = require("express");
const verifyIfRequired = require("./middlewares/verifyIfRequired");
const ensureProcessContext = require("./middlewares/ensureProcessContext");
const debug = require("debug")("furmly-server:routes-process");
const createError = require("http-errors");
const furmlyEngine = require("../lib/setup_fumly_engine");
const infrastructure = require("../lib/setup_infrastructure");
const sendResponse = utils.sendResponse;
const createContext = utils.createContext;

function setup(app) {
  const processes = express.Router();
  const getObjectIdOrQuery = utils.getObjectIdOrQuery;
  const getDomain = utils.getDomain;
  const ensureHasProcessClaim = utils.checkClaim.bind(
    null,
    infrastructure.constants.CLAIMS.PROCESS,
    req => req.process._id.toString(),
    utils.checkIfClaimIsRequired
  );
  const verifyProcessIfRequired = verifyIfRequired.bind(
    null,
    req => req.process
  );
  processes.param("id", function(req, res, next, id) {
    debug("fetching process");
    var query = getObjectIdOrQuery(id, { uid: id });

    furmlyEngine.queryProcess(
      query,
      {
        one: true,
        full: true
      },
      function(er, proc) {
        if (er)
          return next(
            createError(500, "An error occurred while fetching the process", er)
          );
        if (!proc) return next(createError(404, "Could not find process"));
        debug(`process found ${JSON.stringify(proc, null, " ")}`);
        req.process = proc;
        next();
      }
    );
  });
  processes.get("/describe/:id", [
    verifyProcessIfRequired,
    ensureHasProcessClaim,
    ensureProcessContext,
    function(req, res, next) {
      const describe = () =>
        req.process.describe(
          Object.assign(req.query || {}, utils.createContext(req)),
          function(er, description, fetchedData) {
            if (er) next(createError(500, er));
            res.send({
              description: description,
              data: fetchedData
            });
          }
        );
      if (req.user) {
        return getDomain(req.user.domain, req, er => {
          if (er) return next(createError(500, er));
          describe();
        });
      }

      describe();
    }
  ]);

  processes.post("/run/:id", [
    verifyProcessIfRequired,
    ensureHasProcessClaim,
    ensureProcessContext,
    function(req, res, next) {
      const send = () =>
        req.process.run(createContext(req), sendResponse.bind(res, next));
      if (req.user) {
        //populate domain info.
        return utils.getDomain(req.user.domain, req, er => {
          if (er) return next(createError(500, er.message));
          send();
        });
      }
      send();
    }
  ]);
  app.use("/api/process", processes);
}

module.exports = setup;
