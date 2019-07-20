const express = require("express");
const debug = require("debug")("furmly-server:admin");
const verify = require("./middlewares/verify");
const utils = require("./utils");
const createError = require("http-errors");
const infrastructureUtils = require("../lib/utilities");
const infrastructure = require("../lib/setup_infrastructure");
const furmlyEngine = require("../lib/setup_furmly_engine");
function setup(app) {
  const admin = express.Router();
  const checkClaim = utils.checkClaim;
  const emptyVal = utils.emptyVal;
  const sendResponse = utils.sendResponse;
  const createContext = utils.createContext;
  const getDomain = utils.getDomain;
  const getRangeQuery = utils.getRangeQuery;
  const getMongoQuery = utils.getMongoQuery;

  admin.post("/migration", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_migrations,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.saveMigration(
        req.body,
        createContext(req),
        sendResponse.bind(res, next)
      );
    }
  ]);
  admin.get("/acl", [
    function(req, res, next) {
      debug("acl called...");
      if (req.headers.authorization) {
        verify(req, res, function() {
          infrastructure.acl(
            req.user.username,
            req.user.domain,
            req.user.client.clientId,
            req.query.category,
            function(er, menu) {
              if (er) return next(createError(400, er));

              furmlyEngine.queryProcessor(
                {
                  uid: furmlyEngine.constants.UIDS.PROCESSOR.MENU_FILTER
                },
                { one: true },
                function(er, proc) {
                  if (er) return next(createError(400, er));
                  if (!proc) return res.send(menu);
                  debug("running menu filter...");
                  debug(req.user);
                  const run = () => {
                    furmlyEngine.runProcessor(
                      Object.assign(createContext(req), {
                        menu
                      }),
                      proc,
                      sendResponse.bind(res, next)
                    );
                  };

                  if (req.user) {
                    return getDomain(req.user.domain, req, er => {
                      if (er) return next(createError(400, er));
                      run();
                    });
                  }
                  run();
                }
              );
            }
          );
        });
      } else {
        let query = req.query;
        if (!query.category) {
          return next(
            createError(
              401,
              `missing parameters , kindly ensure category is set`
            )
          );
        }
        infrastructure.externalAcl(
          query.domain,
          query.clientId,
          query.category,
          sendResponse.bind(res, next)
        );
      }
    }
  ]);
  admin.get("/furmly/schemas", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_migrations,
      emptyVal
    ),
    function(req, res, next) {
      furmlyEngine.allEntityConfigurations(
        true,
        true,
        sendResponse.bind(res, next)
      );
    }
  ]);
  admin.get("/furmly/entities", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_migrations,
      emptyVal
    ),
    function(req, res, next) {
      let query = getRangeQuery(req, true),
        _filter,
        options = {
          sort: { _id: -1 },
          limit: (req.query.count && parseInt(req.query.count)) || 10
        },
        _continue = (items, er, count) => {
          if (er) return next(createError(400, er));

          return res.send({
            items,
            total: count
          });
        };
      if (req.query._id) query._id = furmlyEngine.createId(req.query._id);

      if (req.query.filter)
        Object.assign(query, (_filter = getMongoQuery(req.query.filter)));

      if (req.query.type == "Schema") {
        return furmlyEngine.allEntityConfigurations(
          true,
          false,
          query,
          options,
          (er, items) => {
            if (er) return next(createError(400, er));

            furmlyEngine.countConfigurations(
              _filter || {},
              _continue.bind(null, items)
            );
          }
        );
      }
      options.full = true;
      options.noTransformaton = true;
      furmlyEngine.query(req.query.type, query, options, (er, items) => {
        if (er) return next(createError(400, er));
        furmlyEngine.count(
          req.query.type,
          _filter || {},
          _continue.bind(null, items)
        );
      });
    }
  ]);
  admin.get("/thirdparty/:db_name/:query_type?", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_migrations,
      emptyVal
    ),
    function(req, res, next) {
      let filter;
      if (req.query.filter) filter = getMongoQuery(req.query.filter);
      if (req.query.lastId) req.query._id = req.query.lastId;

      infrastructureUtils.runThirdPartyMigrationProcessor(
        req.params.db_name,
        Object.assign(createContext(req), {
          filter,
          isEntityRequest: req.params.query_type !== "schema"
        }),
        furmlyEngine,
        (er, items) => {
          if (er) return next(createError(400, er));
          return res.send(items);
        }
      );
    }
  ]);
  admin.get("/schemas", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_migrations,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.getSchemas(sendResponse.bind(res, next));
    }
  ]);
  admin.get("/entities", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_migrations,
      emptyVal
    ),
    function(req, res, next) {
      let query = getRangeQuery(req);
      if (req.query._id) query._id = req.query._id;
      if (req.query.filter)
        Object.assign(query, getMongoQuery(req.query.filter));

      debug(query);
      let middle =
        req.query.type[0].toUpperCase() + req.query.type.substring(1);
      infrastructure[`get${middle}Range`](
        query,
        parseInt(req.query.count),
        sendResponse.bind(res, next)
      );
    }
  ]);
  admin.get("/migration", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_migrations,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.getMigrationRange(
        Object.assign({}, getRangeQuery(req)),
        parseInt(req.query.count),
        sendResponse.bind(res, next)
      );
    }
  ]);
  admin.get("/migration/:id", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_migrations,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.getMigrationById(
        { _id: req.params.id },
        sendResponse.bind(res, next)
      );
    }
  ]);
  app.use("/api/admin", [admin]);
}
module.exports = setup;
