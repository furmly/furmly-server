/**
 * User class
 * @class
 * @param {Object} opts User information.
 * @property {string} username Username [must be unique]
 * @property {Role[]} roles An array of roles the user belongs to.
 * @property {string|ObjectId} domain Domain the user belongs to.
 * @property {Claim[]} claims An array of claims that have been assigned to the user
 */
function User(opts) {
	if (!opts) throw new Error("User needs username and roles");

	if (!opts.username) throw new Error("Users must have a username");

	if (!opts.roles || !opts.roles.length)
		throw new Error("Users must have atleast one role");

	this.username = opts.username;
	this._id = opts._id;
	this.roles = opts.roles;
	this.domain = opts.domain;
	this.claims = opts.claims;
	this.changedPassword = opts.changedPassword;
	this.lastPasswordChange = opts.lastPasswordChange;
	Object.defineProperties(this, {
		password: {
			enumerable: false,
			get: function() {
				return opts.password;
			}
		}
	});
}

/**
 * Returns storable information about the student
 * @param  {Boolean} includePassword flag , if true includes students password in output
 * @return {Object}                 Persistable representation of User.
 */
User.prototype.getImage = function(includePassword) {
	var image = JSON.parse(JSON.stringify(this));
	if (includePassword) image.password = this.password;
	return image;
};

module.exports = User;
