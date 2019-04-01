const express = require("express");
const config = require("./config");
const fs = require("fs");
const debug = require("debug")("furmly-server");
const passport = require("passport");
const passport_auth = require("./lib/passport_auth");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const infrastructure = require("./lib/setup_infrastructure");
const _init = require("./lib/init");
const all = require("require-all");
const path = require("path");

const _configure = (_root, opts = {}) => {
  _root.use(
    morgan("dev", {
      skip: function() {
        return !config.get("log.server");
      }
    })
  );
  if (!opts.skipBodyParser) _root.use(bodyParser.json({ limit: "5mb" }));

  passport_auth.init(infrastructure);
  _root.use(require("./routes/middlewares/clientAuthentication"));
  _root.use(passport.initialize());
  _root.use(function(req, res, next) {
    res.set("Cache-Control", "no-cache");
    next();
  });
  if (process.env.NODE_ENV !== "production") {
    _root.use("/api/doc", express.static("out"));
  }

  //setup routes.
  const routes = all({
    dirname: __dirname + "/routes",
    filter: fileName =>
      (fileName.indexOf("utils") === -1 && path.basename(fileName)) || null,
    excludeDirs: /^middlewares$/
  });
  Object.keys(routes).forEach(key => {
    routes[key](_root);
  });
  _root.use(function(er, req, res, next) {
    res.end(res.writeHead(400, typeof er == "string" ? er : er.message));
  });
};

const start = (cfg = {}) => {
  const app = express();
  let options = {};
  const port =
    cfg.port ||
    config.get("port") ||
    process.env.PORT ||
    cfg.protocol == "https"
      ? 443
      : 8080;
  if (!cfg.protocol || cfg.protocol == "https") {
    options = Object.assign(
      {
        key: fs.readFileSync(
          cfg.privateKeyLocation || config.get("server.privateKeyLocation")
        ),
        cert: fs.readFileSync(
          cfg.certificateLoaction || config.get("server.certificateLocation")
        ),
        requestCert: true,
        rejectUnauthorized: !config.get("server.withCA")
      },
      cfg.options
    );
    if (!options.rejectUnauthorized) {
      options.ca = fs.readFileSync(
        cfg.caLocation || config.get("server.caLocation")
      );
    }
  }

  debug(`server set to listen on ${port}`);
  _configure(app);
  require(cfg.protocol || "https")
    .createServer(options, app)
    .listen(port, _init);
  return app;
};
const asMiddleware = () => {
  const appRoute = express.Router();
  _configure(appRoute, { skipBodyParser: true });
  return appRoute;
};

module.exports = {
  start,
  asMiddleware
};
