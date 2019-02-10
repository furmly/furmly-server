require("dotenv").config();

if (!process.env.NODE_CONFIG_DIR) {
  process.env.NODE_CONFIG_DIR = __dirname;
}
const config = require("config");
module.exports = config;
