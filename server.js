const express = require("express");
const config = require("./config")[
  process.env.profile || process.env.NODE_ENV || "dev"
];
const fs = require("fs");
const furmly = require("furmly-core")(config);
const debug = require("debug")("furmly-server");
const mongoose = require("mongoose");
const url = require("url");
const crypto = require("crypto");
const utils = require("./lib/utilities");
const passport = require("passport");
const oauth2orize = require("oauth2orize");
const passport_auth = require("./lib/passport_auth");
const lib = require("./lib/index");
const request = require("request");
const multer = require("multer");
const templating = require("./lib/templating")(config);
const upload = multer({
  dest: config.fileUpload ? config.fileUpload.tempDir : "/temp"
});
const fileParser = new (require("./lib/parser"))(config);
const async = require("async");
const app = express();
const https = require("https");
const bodyParser = require("body-parser");

const morgan = require("morgan");
const threadPool = new (require("./lib/worker"))(
  (config.threadPool && config.threadPool.size) ||
    require("os").cpus().length - 1,
  [`${__dirname}/node_modules/bson/lib/bson/objectid.js`]
);
const uploadRouter = express.Router();
const downloadRouter = express.Router();

const furmlyEngine = new furmly.Engine({
  entitiesRepository: new furmly.EntityRepo({
    folder: "./entities/",
    storeTTL: config.entRepo.storeTTL,
    config
  })
});

mongoose.Promise = global.Promise;
const conn = mongoose.createConnection(config.data.web_url);
const infrastructureParams = {
  domainStore: new lib.DomainStore(mongoose, conn),
  userStore: new lib.UserStore(mongoose, conn),
  clientStore: new lib.ClientStore(mongoose, conn),
  roleStore: new lib.RoleStore(mongoose, conn),
  claimsStore: new lib.ClaimsStore(mongoose, conn),
  tokenGen: new lib.TokenGenerator(config.token_generator),
  scopedTokenGen: new lib.ScopedTokenGenerator(
    lib.TokenGenerator,
    config.scoped_tokens
  ),
  menuStore: new lib.MenuStore(mongoose, conn),
  defaultClaims: {
    manage_default_process: "manage-default-process",
    create_process: {
      type: lib.Infrastructure.constants.CLAIMS.PROCESS,
      description: "Edit a process",
      value: "CREATE_PROCESS"
    }
  },
  webClient: config.clients.web,
  mobileClient: config.clients.mobile,
  config:
    (config.userManager &&
      debug("use infrastructure property , userManager is [deprecated]"),
    config.userManager) || config.infrastructure
};
const fileUpload = new (require("./lib/file_upload"))(
  config.fileUpload,
  mongoose,
  conn
);
infrastructureParams.migrationStore = new lib.MigrationStore(
  mongoose,
  conn,
  config.migrations,
  require("./lib/furmly_migration_item_resolution_strategy")({
    domainStore: infrastructureParams.domainStore,
    userStore: infrastructureParams.userStore,
    roleStore: infrastructureParams.roleStore,
    claimsStore: infrastructureParams.claimsStore,
    menuStore: infrastructureParams.menuStore,
    clientStore: infrastructureParams.clientStore,
    furmlyEngine
  })
);
const infrastructure = new lib.Infrastructure(infrastructureParams);
furmlyEngine.setInfrastructure({
  userManager: infrastructure,
  fileParser,
  fileUpload,
  threadPool,
  templating,
  request,
  url,
  crypto
});

app.use(
  morgan("dev", {
    skip: function() {
      return !config.log.server;
    }
  })
);
app.use(bodyParser.json({ limit: "5mb" }));

function verifyDownloadAccess(req) {
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
}
function processFileDownload(res, er, data, description) {
  if (er) return sendResponse.call(res, er);

  debug(description);
  res.append("Content-Type", description.mime);
  res.append(
    "Content-Disposition",
    "attachment; filename=" + description.originalName
  );
  res.send(data);
}
function verifyProcessorAccessForDownload(req, res, next) {
  if (!req.query._t1 || !verifyDownloadAccess(req)) return false;
  let interval = (config.download && config.download.processorTTL) || 5000;

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

      //use timeouts because this functions dont properly support callback syntax.
      async.timeout(
        ensureProcessorCanRunStandalone.bind(null, req, res),
        interval
      )
    ],
    er => {
      //abondon etimeouts because its assumed the functions have sent the results.
      if (er && er.code == "ETIMEDOUT") return;
      if (er) return unauthorized(req, res);

      return next();
    }
  );
}

function _init() {
  function _getIconForDefaultProcess(proc) {
    let title = proc.title.toLowerCase();
    if (title.indexOf("processor") !== -1) return "computer";
    if (title.indexOf("schema") !== -1) return "folder";
    if (title.indexOf("lib") !== -1) return "storage";
    if (title.indexOf("create") !== -1) return "developer_board";
    if (title.indexOf("process") !== -1) return "memory";
  }
  infrastructure.init(config.admin.username, config.admin.password, function(
    er
  ) {
    if (er) throw er;
    furmlyEngine.on("error", function(er) {
      debug("an error occurred!!!");
      debug(er);
    });
    furmlyEngine.on("default-process-created", function(proc) {
      //apply for all the claims required in this process.
      //          debugger;
      async.waterfall(
        [
          infrastructure.saveClaim.bind(infrastructure, {
            type: lib.Infrastructure.constants.CLAIMS.PROCESS,
            description: proc.title,
            value: proc._id
          }),
          function(result) {
            var args = Array.prototype.slice.call(arguments);
            var callback = args[args.length - 1];
            infrastructure.addClaimToRole(
              infrastructure.defaultRole,
              null,
              result,
              function(er, role) {
                if (er) throw er;
                infrastructure.getClaims(
                  {
                    type: infrastructure.adminClaims.manage_default_process
                  },
                  callback
                );
              }
            );
          },
          function(result, callback) {
            infrastructure.saveMenu(
              {
                displayLabel: proc.title,
                group: "Configuration",
                icon: _getIconForDefaultProcess(proc),
                claims: result.map(function(x) {
                  return x._id;
                }),
                type: "DYNAMO",
                value: proc._id,
                category: "MAINMENU",
                client: infrastructure.webClient.clientId,
                activated: true
              },
              callback
            );
          }
        ],
        function(er, menu) {
          if (er) throw er;
        }
      );
    });
    furmlyEngine.on("default-processor-created", function(proc) {
      infrastructure.saveClaim(
        {
          type: lib.Infrastructure.constants.CLAIMS.PROCESSOR,
          description: proc.title,
          value: proc._id
        },
        function(er, claim) {
          infrastructure.addClaimToRole(
            infrastructure.defaultRole,
            null,
            claim,
            function(er, role) {
              if (er)
                debug(
                  "an error occurred while adding claim to role:" +
                    infrastructure.defaultRole
                );
            }
          );
        }
      );
    });
    furmlyEngine.init(function(er) {
      if (er) throw er;
      threadPool.start();
    });
  });
}

/*
    Identity Server
 */
var server = oauth2orize.createServer();
server.exchange(
  oauth2orize.exchange.password(function(
    client,
    username,
    password,
    scope,
    done
  ) {
    infrastructure.login(
      scope.length ? scope[0] : null,
      client,
      username,
      password,
      done
    );
  })
);

server.exchange(
  oauth2orize.exchange.refreshToken(function(
    client,
    refreshToken,
    scope,
    done
  ) {
    infrastructure.refreshToken(
      scope.length ? scope[0] : null,
      client,
      refreshToken,
      done
    );
  })
);
passport_auth.init(infrastructure);
app.use(_clientAuthentication);
app.use(passport.initialize());
app.use("/auth/token", [
  passport.authenticate(["clientPassword"], {
    session: false
  }),
  server.token(),
  unauthorized
]);

uploadRouter.post("/", [
  upload.single("file"),
  function(req, res) {
    fileUpload.upload(req.user, req.file, req.body, function(er, result) {
      if (er) return sendResponse.call(res, er);
      sendResponse.call(res, null, result);
    });
  }
]);

uploadRouter.get("/preview/:id", function(req, res) {
  fileUpload.readFile(req.params.id, req.user, function(er, data, description) {
    if (er) return sendResponse.call(res, er);

    fileParser.parse(description, data, res, req);
  });
});

downloadRouter.get("/:id", [
  verify.bind(
    new VerificationOverride((req, res, next) => {
      //verify using scoped token generator.
      if (verifyProcessorAccessForDownload(req, res, next)) return;
      if (verifyDownloadAccess(req)) return next();
      return unauthorized(req, res);
    })
  ),
  function(req, res) {
    if (!req.query._t1)
      return fileUpload.readFile(
        req.params.id,
        req.fileAccess,
        processFileDownload.bind(this, res)
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
        if (er) return sendResponse.call(res, er);
        if (!result || !result.id)
          return sendResponse.call(
            res,
            new Error("Processor returned no file")
          );

        fileUpload.readFile(
          result.id,
          result.user,
          processFileDownload.bind(this, res)
        );
      }
    );
  }
]);

app.use(function(req, res, next) {
  res.set("Cache-Control", "no-cache");
  next();
});
app.use("/api/upload", [
  //check if user is logged in. If he's not still let him pass.
  verify.bind(new VerificationOverride((req, res, next) => next())),
  uploadRouter
]);
app.use("/api/download", [downloadRouter]);


if (process.env.NODE_ENV !== "production") {
  app.use("/api/doc", express.static("out"));
}
app.use("/api/admin", [admin]);
//error handler.
app.use(function(er, req, res, next) {
  debug("an error occurred!!!");
  debug(er);
  sendResponse.call(res, er);
});

if (process.env.profile !== "integrationTest")
  process.on("uncaughtException", function(er) {
    debug("something really bad has happened...\nlogging and exiting.");
    require("fs").writeFileSync(
      "./error/" + new Date().getTime() + ".txt",
      "::" + er.toString() + er.stack + "\t\n" + new Date().toString(),
      "utf-8"
    );

    process.exit(1);
  });
module.exports = {
  start(cfg) {
    const options = {
      key: fs.readFileSync("server-key.pem"),
      cert: fs.readFileSync("server-crt.pem"),
      ca: fs.readFileSync("ca-crt.pem"),
      requestCert: true,
      rejectUnauthorized: false
    };
    const port = cfg.port || config.port || process.env.PORT || 443;
    debug(`listening on ${port}`);
    https.createServer(options, app).listen(port, _init);
  }
};
