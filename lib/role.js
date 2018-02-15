/**
 * User role class
 * @class
 * @param {Object} opts configuration object , which includes claims and name (name is compulsory).
 * @property {string} name Name of the role
 * @property {Claim[]} claims Array of claims.
 * @property {string|ObjectId} _id Id of role.
 */
function Role(opts) {
	if (!opts) throw new Error("Role configuration opts missing");
	if (!opts.name) throw new Error("Every role requires a name");

	this.claims = opts.claims || [];
	this.name = opts.name;
	if (opts.domain) this.domain = opts.domain;
	this._id = opts._id;
}

module.exports = Role;
