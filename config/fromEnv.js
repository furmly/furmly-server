const defer = require("config/defer").deferConfig;
module.exports = function(name, defaultValue) {
  return defer(function() {
    return process.env[name] || defaultValue;
  });
};
