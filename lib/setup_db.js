const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const config = require("../config");
module.exports = mongoose.createConnection(config.get("data.web_url"), {
  useNewUrlParser: true
});
