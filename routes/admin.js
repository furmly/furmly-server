const express = require("express");
const debug = require("debug")("furmly-server:admin");
const verify = require("./middlewares/verify");
const utils = require("./utils");
const createError = require("http-errors");
const async = require("async");
const infrastructureUtils = require("../lib/utilities");
const infrastructure = require("../lib/index");
const furmlyEngine = require("../lib/furmly_engine");
const fileUpload = require("../lib/uploader");
function setup(app, options) {
  const admin = express.Router();
  const checkClaim = utils.checkClaim;
  const emptyVal = utils.emptyVal;
  const sendResponse = utils.sendResponse;
  const createContext = utils.createContext;
  const getDomain = utils.getDomain;
  const getRangeQuery = utils.getRangeQuery.bind(null, furmlyEngine);
  const getMongoQuery = utils.getMongoQuery;
  const toRegex = utils.toRegex;
  // const fileUpload = options.fileUpload;
  admin.get("/claimable", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_claims,
      emptyVal
    ),
    function(req, res, next) {
      furmlyEngine.queryProcessor(
        {},
        { fields: { title: 1 }, noTransformaton: true },
        (er, processors) => {
          if (er) return next(createError(400, er));

          furmlyEngine.queryProcess(
            {},
            { fields: { title: 1 }, noTransformaton: true },
            (er, processes) => {
              if (er) return next(createError(400, er));

              res.send(
                processors
                  .map(x => ({
                    displayLabel: x.title,
                    _id: x._id
                  }))
                  .concat(
                    processes.map(x => ({
                      displayLabel: x.title,
                      _id: x._id
                    }))
                  )
              );
            }
          );
        }
      );
    }
  ]);

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

  admin.post("/user", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_users,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.register(req.body, sendResponse.bind(res, next));
    }
  ]);

  admin.post("/user/edit", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_users,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.updateUser(req.body, sendResponse.bind(res, next));
    }
  ]);
  admin.post("/role", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_roles,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.createRole(req.body, sendResponse.bind(res, next));
    }
  ]);
  admin.post("/role/edit", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_roles,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.updateRole(req.body, sendResponse.bind(res, next));
    }
  ]);
  admin.post("/claim", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_claims,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.saveClaim(req.body, sendResponse.bind(res, next));
    }
  ]);

  admin.delete("/claim/:id", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_claims,
      emptyVal
    ),
    function(req, res, next) {
      debug(req.params);
      infrastructure.deleteClaim(req.params.id, sendResponse.bind(res, next));
    }
  ]);

  admin.post("/menu", [
    verify,
    checkClaim.bind(null, infrastructure.adminClaims.can_manage_menu, emptyVal),
    function(req, res, next) {
      infrastructure.saveMenu(req.body, sendResponse.bind(res, next));
    }
  ]);

  admin.get("/acl", [
    function(req, res, next) {
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

  admin.get("/user", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_users,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.getUserRange(
        Object.assign(
          {},
          (req.query.domain && { domain: req.query.domain }) || {},
          (req.query.username && {
            username: toRegex(req.query.username)
          }) ||
            {},
          getRangeQuery(req)
        ),
        parseInt(req.query.count),
        sendResponse.bind(res, next)
      );
    }
  ]);

  admin.get("/user/byid/:id", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_users,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.getUserById(
        { _id: req.params.id },
        sendResponse.bind(res, next)
      );
    }
  ]);

  admin.get("/role", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_roles,
      emptyVal
    ),
    function(req, res, next) {
      if (!req.query.all)
        return infrastructure.getRoleRange(
          Object.assign(
            (req.query.domain && { domain: req.query.domain }) || {},
            (req.query.name && { name: toRegex(req.query.name) }) || {},
            getRangeQuery(req)
          ),
          parseInt(req.query.count),
          sendResponse.bind(res, next)
        );

      infrastructure.getRoles({}, sendResponse.bind(res, next));
    }
  ]);
  admin.get("/role/:id", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_roles,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.getRole(req.params.id, sendResponse.bind(res, next));
    }
  ]);

  admin.get("/menu/:id", [
    verify,
    checkClaim.bind(null, infrastructure.adminClaims.can_manage_menu, emptyVal),
    function(req, res, next) {
      infrastructure.getMenu(req.params.id, sendResponse.bind(res, next));
    }
  ]);
  admin.get("/claim", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_claims,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.getClaims({}, sendResponse.bind(res, next));
    }
  ]);

  admin.get("/claim/paged", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_claims,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.getClaimRange(
        Object.assign(
          (req.query.description && {
            description: toRegex(req.query.description)
          }) ||
            {},
          getRangeQuery(req)
        ),
        parseInt(req.query.count),
        sendResponse.bind(res, next)
      );
    }
  ]);

  admin.post("/domain", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_domains,
      emptyVal
    ),
    function(req, res, next) {
      let files = [req.body.logo, req.body.image];
      fileUpload.isPerm(files, (er, results) => {
        if (er) return next(createError(400, er));
        let tasks = results.reduce((sum, x, index) => {
          if (!x)
            sum.push(
              fileUpload.moveToPermanentSite.bind(
                fileUpload,
                files[index],
                true // this file should be available to everyone.
              )
            );
          return sum;
        }, []);
        if (tasks.length)
          async.parallel(tasks, er => {
            if (er) return next(createError(400, er));
            infrastructure.saveDomain(req.body, sendResponse.bind(res, next));
          });
        else infrastructure.saveDomain(req.body, sendResponse.bind(res, next));
      });
    }
  ]);

  admin.get("/domain", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_domains,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.getDomains({}, sendResponse.bind(res, next));
    }
  ]);

  admin.get("/domain/paged", [
    verify,
    checkClaim.bind(
      null,
      infrastructure.adminClaims.can_manage_domains,
      emptyVal
    ),
    function(req, res, next) {
      infrastructure.getDomainRange(
        Object.assign(
          (req.query.name && { name: toRegex(req.query.name) }) || {},
          getRangeQuery(req)
        ),
        parseInt(req.query.count),
        sendResponse.bind(res, next)
      );
    }
  ]);

  admin.get("/menu", [
    verify,
    checkClaim.bind(null, infrastructure.adminClaims.can_manage_menu, emptyVal),
    function(req, res, next) {
      infrastructure.getMenuRange(
        Object.assign(
          (req.query.title && {
            displayLabel: toRegex(req.query.title)
          }) ||
            {},
          getRangeQuery(req)
        ),
        parseInt(req.query.count),
        sendResponse.bind(res, next)
      );
    }
  ]);
  app.use("/api/admin", [admin]);
}
module.exports = setup;
