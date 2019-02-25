const defer = require("config/defer").deferConfig;
module.exports = function(name, defaultValue, converter) {
  const converters = {
    bool: function(string) {
      return string == "true";
    }
  };
  return defer(function() {
    if (process.env.hasOwnProperty(name)) {
      if (typeof converter == "string") {
        if (!converters[converter]) throw new Error("Unknown converter " + converter);
        return converters[converter](process.env[name]);
      }
      if (typeof converter == "function") return converter(process.env[name]);
      return process.env[name];
    }
    return defaultValue;
  });
};
