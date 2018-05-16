/**
 * TokenGenerator Class. Responsible for creating accesstokens.
 * @param {Object} opts configuration object.
 */
function ScopedTokenGenerator(TokenGeneratorClass, config) {
	if (!TokenGeneratorClass) throw new Error("TokenGeneratorClass is missing");

	if (!config) throw new Error("Scoped Token generator has no config");

	//create token generators per scope
	Object.keys(config).forEach(key => {
		this[key] = new TokenGeneratorClass(config[key]);
	});
}

/**
 * Creates an accesstoken
 * @param  {Object} data information to sign
 * @param  {Number} exp  Time to live
 * @return {String}      Signed accesstoken
 */
ScopedTokenGenerator.prototype.sign = function(scope, data, exp) {
	//sign the token and return it.
	if (!this[scope]) throw new Error("Unknown scope");
	return this[scope].sign(data, exp);
};

/**
 * Verifies an accesstoken
 * @param  {String}   token token to verify
 * @param  {Function} fn    callback
 * @return {Object}         original data if successful, null if not.
 */
ScopedTokenGenerator.prototype.verify = function(scope, token, fn) {
	if (!this[scope]) throw new Error("Unknown scope");
	return this[scope].verify(token, fn);
};

module.exports = ScopedTokenGenerator;
