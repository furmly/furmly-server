const request = require("request");
const config = require("../config");
const templating = require("./templating")(config);
const fileParser = require("./services/parser");
const fileUpload = require("./uploader");
const server = require("./setup_infrastructure");
const threadPool = require("./threadpool");
const furmly = require("furmly-core")(config);
const url = require("url");
const crypto = require("crypto");
const furmlyEngine = new furmly.Engine({
  entitiesRepository: new furmly.EntityRepo({
    storeTTL: config.get("entRepo.storeTTL"),
    config
  })
});

// this is available in your processors as this.entityRepo.infrastructure()
furmlyEngine.setInfrastructure({
  server,
  fileParser,
  fileUpload,
  threadPool,
  templating,
  request,
  url,
  crypto,
  config: config.has("processor_config") && config.get("processor_config")||{}
});

furmlyEngine.constants = furmly.constants;

module.exports = furmlyEngine;
