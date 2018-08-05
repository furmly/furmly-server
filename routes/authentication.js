const createError = require("http-errors");
const oauth2orize = require("oauth2orize");
const passport = require("passport");
const infrastructure = require("../lib/index");
function setup(app) {
  var server = oauth2orize.createServer();
  server.exchange(
    oauth2orize.exchange.password(function(
      client,
      username,
      password,
      scope,
      done
    ) {
      infrastructure.login(
        scope.length ? scope[0] : null,
        client,
        username,
        password,
        done
      );
    })
  );

  server.exchange(
    oauth2orize.exchange.refreshToken(function(
      client,
      refreshToken,
      scope,
      done
    ) {
      infrastructure.refreshToken(
        scope.length ? scope[0] : null,
        client,
        refreshToken,
        done
      );
    })
  );
  app.use("/auth/token", [
    passport.authenticate(["clientPassword"], {
      session: false
    }),
    server.token(),
    (...args) => args[2](new createError.Unauthorized())
  ]);
}
module.exports = setup;
