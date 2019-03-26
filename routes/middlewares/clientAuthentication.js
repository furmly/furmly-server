const debug = require("debug")("furmly-server:client-authentication");
const config = require("../../config");
function _clientAuthentication(req, res, next) {
  if (req.client.authorized) {
    debug("client certificate is present");
    var cert = req.socket.getPeerCertificate();
    if (cert.subject) {
      debug(`certificate subject: ${JSON.stringify(cert.subject, null, " ")}`);
      debug(`issuer:${JSON.stringify(cert.issuer, null, " ")}`);
      const name = `developers.${cert.subject.CN}`;
      req._clientAuthorized =
        config.has(name) &&
        !!config.get(name) &&
        config.get("CA.CN")[cert.issuer.CN];
      debug(
        `client is ${req._clientAuthorized ? "authorized" : "unauthorized"}`
      );
    }
  }
  next();
}

module.exports = _clientAuthentication;
