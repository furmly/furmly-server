const jwt = require("jsonwebtoken");
/**
 * TokenGenerator Class. Responsible for creating accesstokens.
 * @param {Object} opts configuration object.
 */
function TokenGenerator(opts) {
	if (!opts) throw new Error("Auth configuration opts missing");

	if (!opts.issuer) throw new Error("Auth service must have an issuer");

	if (!opts.secret) throw new Error("Auth service must have a secret");

	if (!opts.audience) throw new Error("Auth service must have an audience");

	this.audience = opts.audience;
	this.secret = opts.secret;
	this.issuer = opts.issuer;
}

/**
 * Creates an accesstoken
 * @param  {Object} data information to sign
 * @param  {Number} exp  Time to live
 * @return {String}      Signed accesstoken
 */
TokenGenerator.prototype.sign = function(data, exp) {
	//sign the token and return it.
	return jwt.sign(
		{
			exp: exp,
			data: data
		},
		this.secret,
		{
			audience: this.audience,
			issuer: this.issuer
		}
	);
};

/**
 * Verifies an accesstoken
 * @param  {String}   token token to verify
 * @return {Object}         original data if successful, null if not.
 */
TokenGenerator.prototype.verify = function(token) {
	return jwt.verify(token, this.secret, {
		audience: this.audience,
		issuer: this.issuer
	});
};

module.exports = TokenGenerator;
