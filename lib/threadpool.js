const config = require("../config");
module.exports = new (require("./services/worker"))(
  config.get("threadPool.size") || require("os").cpus().length - 1,
  [`${__dirname}/node_modules/bson/lib/bson/objectid.js`]
);
