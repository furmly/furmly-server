const debug = require("debug")("furmly-server:client-authentication");
const config = require("../../config");
function _clientAuthentication(req, res, next) {
  if (req.client.authorized) {
    debug("client certificate is present");
    var cert = req.socket.getPeerCertificate();
    if (cert.subject) {
      debug(`certificate subject: ${JSON.stringify(cert.subject, null, " ")}`);
      req._clientAuthorized =
        !!config.get(`developers.${cert.subject.CN}`) &&
        cert.issuer.CN == config.get("CA.CN");
      debug(
        `client is ${req._clientAuthorized ? "authorized" : "unauthorized"}`
      );
    }
  }
  next();
}

module.exports = _clientAuthentication;
