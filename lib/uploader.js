const mongoose = require("mongoose");
const config = require("../config");
const conn = require("./setup_db");
module.exports = new (require("./services/file_upload"))(
  config.get("fileUpload"),
  mongoose,
  conn
);
