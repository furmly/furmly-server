const debug = require("debug")(
  "furmly-server:ensure-process-context-middleware"
);
const createError = require("http-errors");
module.exports = function(req, res, next) {
  debug(
    `requiresIdentity:${req.process.requiresIdentity} userContext:${
      req.user
    } ClaimNotRequired:${req._claimNotRequired}`
  );
  if (
    !req.process.requiresIdentity &&
    req.headers.authorization &&
    req._claimNotRequired
  ) {
    return (
      debug(
        "Process does not require a context and does not have a claim but one is provided"
      ),
      debug(req.process),
      next(createError(400, "You may need to logout to continue"))
    );
  }
  next();
};
