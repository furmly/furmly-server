module.exports = {
  init: function(infrastructure) {
    var passport = require("passport"),
      ClientPasswordStrategy = require("passport-oauth2-client-password")
        .Strategy,
      BearerStrategy = require("passport-http-bearer").Strategy;

    /**
     * These strategies are used to authenticate registered OAuth clients.
     * The authentication data may be delivered using the basic authentication scheme (recommended)
     * or the client strategy, which means that the authentication data is in the body of the request.
     */

    passport.use(
      "clientPassword",
      new ClientPasswordStrategy(function(clientId, clientSecret, done) {
        infrastructure.getClients({ _id: clientId }, (er, clients) => {
          if (!clients.length || clients[0].clientSecret !== clientSecret)
            return done(new Error("Unknown client"));
          done(null, {
            clientId: clientId
          });
        });
      })
    );

    /**
     * This strategy is used to authenticate users based on an access token (aka a
     * bearer token).
     */
    passport.use(
      "accessToken",
      new BearerStrategy(
        {
          passReqToCallback: true
        },
        function(req, accessToken, done) {
          infrastructure.verify(accessToken, function(er, user) {
            if (er && er.message !== "jwt expired") return done(er);

            return done(null, user ? user.data : false);
          });
        }
      )
    );
  }
};
