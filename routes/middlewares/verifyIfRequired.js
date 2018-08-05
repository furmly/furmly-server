const debug = require("debug")("furmly-server:verify-if-required-middleware");
const createError = require("http-errors");
const verify = require("./verify");
module.exports = function(getItem, req, res, next) {
  debug("checking if identity is required...");
  var item = getItem(req);
  if (!item)
    return (
      debug("cannot find the item"),
      next(createError(404, "we couldnt find what you were looking for"))
    );
  if (item.requiresIdentity || typeof item.requiresIdentity == "undefined")
    return debug("identity is required"), verify(req, res, next);

  debug("identity is not required");
  next();
};
