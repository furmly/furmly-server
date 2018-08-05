const passport = require("passport");
const utils = require("../utils");
const createError = require("http-errors");
const debug = require("debug")("furmly-server:verify-middleware");
const VerificationOverride = utils.VerificationOverride;

function verify(req, res, next) {
  passport.authenticate(
    "accessToken",
    {
      session: false
    },
    (er, user) => {
      if (er) {
        return next(createError(400, er));
      }
      debug(user || "user is null");
      if (user) req.user = user;
      if (VerificationOverride.prototype.isPrototypeOf(this))
        return (
          debug("verification has been overriden"), this.verify(req, res, next)
        );
      if (user) return next();
      return next(new createError.Unauthorized());
    }
  )(req, res, next);
}

module.exports = verify;
