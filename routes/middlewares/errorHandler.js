const debug = require("debug")("furmly-server:error-handler-middleware");
const utils = require("../utils");
function errorHandler(er, req, res, next) {
  if (res.headersSent) {
    return next(er);
  }
  const errorMessage = utils.removeNonASCIICharacters(er.message);
  debug(er);
  res.status(er.status || 500);
  res.append("ErrorMessage", errorMessage);
  res.statusMessage = errorMessage;
  res.send({
    error:
      "An unknown error occurred. We' have to find out why. In the meantime try a refresh.",
    errors: er.errors,
    error_description: er.message
  });
}
module.exports = errorHandler;
