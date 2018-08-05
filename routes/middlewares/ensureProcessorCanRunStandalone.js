const debug = require("debug")(
  "furmly-server:ensure-processor-can-run-standalone-middleware"
);
const createError = require("http-errors");
module.exports = function(req, res, next) {
  if (!req.processor || !req.processor.standalone) {
    return (
      debug("processor cannot run standalone"),
      debug(req.processor),
      next(createError(400, "That action requires the proper context to run"))
    );
  }
  return next();
};
