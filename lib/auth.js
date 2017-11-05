var jwt = require("jsonwebtoken"),
	bcrypt = require("bcrypt"),
	async = require("async"),
	debug = require("debug")("user-manager"),
	utils = require("util"),
	localUtils = require("./utilities"),
	crypto = require("crypto");

/**
 * Function for transforming query result
 * @param  {Function} fn callback
 * @param  {Object}   er Error
 * @param  {Object}   x  Result to transform
 * @return {Object}      Transformed result
 */
function transformAndSend(fn, er, x) {
	if (typeof fn !== "function") {
		debugger;
		debug(arguments);
	}
	if (er) return fn(er);
	if (x) {
		if (x instanceof Array) {
			x = x.map(this.transform);
		} else {
			x = this.transform(x);
		}
	}

	return fn(null, x);
}

/**
 * Used to generate random base64 string
 * @param  {Number} len Length of string to generate
 * @return {String}     Random String
 */
function randomValueBase64(len) {
	return crypto
		.randomBytes(Math.ceil(len * 3 / 4))
		.toString("base64") // convert to base64 format
		.slice(0, len) // return required number of characters
		.replace(/\+/g, "0") // replace '+' with '0'
		.replace(/\//g, "0"); // replace '/' with '0'
}

/**
 * Generates a salt and encrypts plaintext using bcrypt
 * @param  {String}   plainText plainText to encrypt
 * @param  {Function} cb        callback
 * @return {String}             Cipher Text (encryted string)
 */
function encrypt(plainText, cb) {
	bcrypt.genSalt(10, function(err, salt) {
		if (err) {
			cb(err);
		}
		bcrypt.hash(plainText, salt, function(err, hash) {
			cb(err, hash);
		});
	});
}

/**
 * User class
 * @param {Object} opts User information.
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

/**
 * User role calss
 * @param {Object} opts configuration object , which includes claims and name (name is compulsory).
 */
function Role(opts) {
	if (!opts) throw new Error("Role configuration opts missing");
	if (!opts.name) throw new Error("Every role requires a name");

	this.claims = opts.claims || [];
	this.name = opts.name;
	if (opts.domain) this.domain = opts.domain;
	this._id = opts._id;
}

/**
 * This is the interface that systems outside the domain can interact with.
 * @param {Object} opts Configuration object.(userStore,roleStore,claimsStore and tokenGen are compulsory)
 */
function UserManager(opts) {
	if (!opts) throw new Error("UserManager configuration opts missing");

	if (!opts.userStore) throw new Error("UserManager must have a user store");

	if (!opts.roleStore) throw new Error("UserManager requires a role store");

	if (!opts.claimsStore)
		throw new Error("UserManager requires a claims store");

	if (!opts.tokenGen)
		throw new Error("UserManager requires a token generation strategy");

	if (!opts.menuStore) throw new Error("UserManager requires a menu store");

	if (!opts.clientStore)
		throw new Error("UserManager requires a clientStore");
	if (!opts.domainStore)
		throw new Error("UserManager requires a domainStore");
	this.config = opts.config;

	this.constants = UserManager.constants;
	this.userStore = opts.userStore;
	this.clientStore = opts.clientStore;
	this.claimsStore = opts.claimsStore;
	this.roleStore = opts.roleStore;
	this.tokenGen = opts.tokenGen;
	this.menuStore = opts.menuStore;
	this.domainStore = opts.domainStore;
	this.adminClaims = localUtils.assign(
		{
			can_manage_claims: "can-manage-claims",
			can_manage_roles: "can-manage-roles",
			can_manage_menu: "can-manage-menus",
			can_manage_users: "can-manage-users",
			can_manage_domains: "can-manage-domains"
		},
		opts.defaultClaims || {}
	);
	this.defaultRole = opts.defaultRole || "developer";
	this.webClient = opts.webClient || {
		clientId: "U6Ev60tUEFw6LZYe3lttdWeG8VagXdJi",
		clientSecret: "V4JQ1f52RUTw4TrqLRcrdLNJhChkWDer"
	};
	this.mobileClient = opts.mobileClient || {
		clientId: "hDA4nGaIkHmdh3NtQmRewBkxIXNsyzyB",
		clientSecret: "xc3vxvfHa6hL63dsbyqla0PtOStVswBW"
	};
	var groupName = "Dynamo Administration",
		type = "CLIENT",
		category = "MAINMENU";
	this.adminMenus = {
		manage_claims: {
			displayLabel: "Manage Claims",
			icon: "description",
			client: this.webClient.clientId,
			category: category,
			type: type,
			uid: "manage_claims",
			group: groupName,
			claim: this.adminClaims.can_manage_claims
		},
		manage_domains: {
			displayLabel: "Manage Domains",
			icon: "web",
			category: category,
			client: this.webClient.clientId,
			type: type,
			uid: "manage_domains",
			group: groupName,
			claim: this.adminClaims.can_manage_domains
		},
		manage_users: {
			displayLabel: "Manage Users",
			icon: "people",
			category: category,
			client: this.webClient.clientId,
			type: type,
			uid: "manage_users",
			group: groupName,
			claim: this.adminClaims.can_manage_users
		},
		manage_menu: {
			displayLabel: "Manage Menus",
			icon: "menu",
			category: category,
			client: this.webClient.clientId,
			type: type,
			uid: "manage_menu",
			group: groupName,
			claim: this.adminClaims.can_manage_menu
		},
		manage_roles: {
			displayLabel: "Manage Roles",
			icon: "supervisor_account",
			category: category,
			client: this.webClient.clientId,
			type: type,
			uid: "manage_roles",
			group: groupName,
			claim: this.adminClaims.can_manage_roles
		}
	};

	debug(this);
}
UserManager.constants = {
	CLAIMS: {
		PROCESSOR: "http://www.dynamo.com/processor",
		PROCESS: "http://www.dynamo.com/process"
	}
};
/**
 * Setups up defaults ( user,roles,claims,menus )
 * @param  {String}   default_admin_username default admin username
 * @param  {String}   default_admin_password default admin password
 * @param  {Function} fn                     callback
 * @return {Object}                          returns an object when there is an error.
 */
UserManager.prototype.init = function(
	default_admin_username,
	default_admin_password,
	fn
) {
	var self = this,
		_fn = fn;
	fn = er => {
		debugger;
		if (er) return _fn(er);
		this.userStore.init((this.config && this.config.tokenTTL) + 120, _fn);
	};

	function createDefaultAdminUser(er, role) {
		if (er) return fn(er);

		self.register(
			{
				username: default_admin_username,
				password: default_admin_password,
				roles: [role._id]
			},
			function(er, user) {
				if (er && er.message !== "user already exists") return fn(er);

				createDefaultMenuItems.call(self, role);
			}
		);
	}

	function createDefaultRole(er, claims) {
		if (er) return fn(er);

		self.roleStore.getRole(self.defaultRole, function(er, role) {
			if (er) return fn(er);

			if (!role) {
				var req = {
					name: self.defaultRole,
					claims: claims.map(function(x) {
						return x._id;
					})
				};

				self.createRole(req, createDefaultAdminUser);
				return;
			}
			createDefaultAdminUser(null, role);
		});
	}

	function createDefaultMenuItems(role) {
		var claims = role.claims,
			keys = Object.keys(self.adminMenus),
			menus = keys.map(function(x) {
				return self.adminMenus[x].uid;
			});

		self.menuStore.getMenus(
			{
				uid: {
					$in: menus
				}
			},
			function(er, result) {
				//console.log('result length:' + result.length);
				if (er) return fn(er);
				var tasks = [];
				if (result.length !== menus.length) {
					result.forEach(function(x) {
						if (menus.indexOf(x.uid) !== -1)
							menus.splice(menus.indexOf(x.uid), 1);
					});
					menus.forEach(function(x) {
						var request = self.adminMenus[x];
						//debug(request);
						request.claims = [
							claims.filter(function(z) {
								return z.type == request.claim;
							})[0]._id
						];
						request.activated=true
						tasks.push(self.saveMenu.bind(self, request));
					});
					//console.log('tasks size:' + tasks.length);
					if (tasks.length) {
						async.parallel(tasks, createDefaultClients);
						return;
					}
				}

				createDefaultClients(null);
			}
		);
	}

	function createDefaultClients(er) {
		if (er) return fn(er);
		async.parallel(
			[
				self.clientStore.createOrUpdate.bind(
					self.clientStore,
					{
						clientId: self.webClient.clientId
					},
					self.webClient
				),
				self.clientStore.createOrUpdate.bind(
					self.clientStore,
					{
						clientId: self.mobileClient.clientId
					},
					self.mobileClient
				)
			],
			fn
		);
	}

	function createDefaultClaims() {
		var claims = Object.keys(this.adminClaims).map(prop => {
				return this.adminClaims[prop];
			}),
			query = [
				{
					type: {
						$in: claims.filter(x => typeof x == "string")
					}
				}
			],
			fullClaims = claims.filter(x => typeof x == "object"),
			query = fullClaims.length ? query.concat(fullClaims) : query;
		this.claimsStore.get(
			{
				$or: query
			},
			function(er, res) {
				if (er) return fn(er);
				var tasks = [];
				res.forEach(function(x) {
					if (claims.indexOf(x.type) !== -1) {
						return claims.splice(claims.indexOf(x.type), 1);
					}

					var filtered = claims.filter(
						v => v.type == x.type && v.value == x.value
					);
					if (filtered.length)
						claims.splice(claims.indexOf(filtered[0]), 1);
				});

				claims.forEach(function(x) {
					tasks.push(function(callback) {
						//console.log(x);
						self.claimsStore.save(
							typeof x == "object"
								? x
								: {
										type: x,
										description: x
									},
							function(er, claim) {
								callback(er, claim);
							}
						);
					});
				});
				if (tasks.length) {
					async.parallel(tasks, createDefaultRole);
					return;
				}

				createDefaultRole(null, res);
			}
		);
	}

	createDefaultClaims.call(this);
};

UserManager.prototype.inRole = function(roleName, user) {
	if (!user) throw new Error("user cannot be null or undefined");
	if (!roleName) throw new Error("roleName cannot be null");
	if (!user.roles) throw new Error("roles cannot be null");

	return !!user.roles.filter(x => x.name.toLowerCase() == roleName).length;
};

/**
 * Configuration array for creating range methods
 * @type {Array}
 */
var ranges = [
	{
		className: "Domain",
		storeName: "domainStore"
	},
	{
		className: "User",
		storeName: "userStore"
	},
	{
		className: "Role",
		storeName: "roleStore"
	},
	{
		className: "Menu",
		storeName: "menuStore"
	},
	{
		className: "Claim",
		storeName: "claimsStore"
	},
	{
		className: "Client",
		storeName: "clientStore"
	}
];
ranges.forEach(function(x) {
	/**
	 * Dynamically created Range Method.
	 * @return {Array} List containing items with a maximum size of the param count.
	 */
	UserManager.prototype["get" + x.className + "Range"] = function() {
		this[x.storeName].getRange.apply(
			this[x.storeName],
			Array.prototype.slice.call(arguments)
		);
	};
});

/**
 * Login user using password.
 * @param  {String}   client   client making the request on the users behalf
 * @param  {String}   username username 
 * @param  {String}   password the user's password
 * @param  {Function} fn       callback
 * @return {Object}            returns access_token,refresh_token and expiry date of access_token
 */
UserManager.prototype.login = function(domain, client, username, password, fn) {
	var self = this;
	this.checkPassword(domain, username, password, function(er, user) {
		if (er) return fn(er);
		_createToken.call(self, user, client, domain, fn);
	});
};

function _createToken(user, client, domain, fn) {
	var ttl = (this.config && this.config.tokenTTL) || 60 * 60;
	debug("time to live:" + ttl);
	var expTime = Math.floor(Date.now() / 1000) + ttl;
	user.client = client;
	var accessToken = this.tokenGen.sign(user, expTime);
	var refreshToken = randomValueBase64(128);
	var refreshTokenHash = crypto
		.createHash("sha1")
		.update(refreshToken)
		.digest("hex");

	this.userStore.createRefreshToken(
		refreshTokenHash,
		user.username,
		client.clientId,
		domain,
		function(er, result) {
			fn(null, accessToken, refreshToken, {
				expires_in: new Date(expTime * 1000 - ttl)
			});
		}
	);
}

/**
 * Convert refresh token to access token
 * @param  {String}   domain       Clients domain
 * @param  {Object}   client       Client Object
 * @param  {String}   refreshToken Refresh token
 * @param  {Function} fn           Callback
 * @return {Object}                  token
 */
UserManager.prototype.refreshToken = function(
	domain,
	client,
	refreshToken,
	fn
) {
	let self = this,
		refreshTokenHash = crypto
			.createHash("sha1")
			.update(refreshToken)
			.digest("hex");

	debug("hashed token:" + refreshTokenHash);

	this.userStore.getRefreshToken(
		refreshTokenHash,
		client.clientId,
		domain,
		function(er, token) {
			if (er) return fn(er);
			if (!token) return fn(new Error("Session Expired."));

			self.userStore.getUser(token.userId, function(er, user) {
				if (er) return fn(er);
				if (!user) return fn(new Error("Session Expired"));

				_createToken.call(self, user, client, domain, fn);
			});
		}
	);
};

UserManager.prototype.checkPassword = function(domain, username, password, fn) {
	var self = this,
		args = Array.prototype.slice.call(arguments);
	//added to support legacy code that required clientId
	//will remove before release.
	if (args.length == 5) {
		username = args[2];
		password = args[3];
		fn = args[4];
	}
	this.userStore.getUser(new RegExp(`^${username}$`, "i"), domain, function(
		er,
		user
	) {
		if (er) return fn(er);

		if (!user) return fn(new Error("Invalid Credentials"));

		bcrypt.compare(password, user.password, function(er, res) {
			if (er) return fn(er);

			if (!res) return fn(new Error("Invalid Credentials"));

			fn(null, user);
		});
	});
};

UserManager.prototype.changePassword = function(
	username,
	domain,
	password,
	newPassword,
	fn
) {
	if (newPassword == password) {
		return setImmediate(fn, new Error("passwords cannot be the same"));
	}
	if (!newPassword) {
		return setImmediate(fn, new Error("new password cannot be blank"));
	}
	this.checkPassword(domain, username, password, (er, user) => {
		if (er) return fn(er);

		//passwords match so update new password.
		encrypt(newPassword, (er, hash) => {
			if (er) return fn(er);
			update = user.getImage();
			update.password = hash;
			this.userStore.save(update, true, fn);
		});
	});
};

/**
 * Get user by username and domain.
 * @param  {String}   username Username
 * @param  {ObjectId}   domain   Domain
 * @param  {Function} fn       Callback
 * @return {Object}            User.
 */
UserManager.prototype.getUser = function(username, domain, fn) {
	this.userStore.getUser(username, domain, fn);
};

/**
 * Registers a new user
 * @param  {Object}   data user info, which includes username ,password and role
 * @param  {Function} fn   callback
 * @return {Object}        Created User.
 */
UserManager.prototype.register = function(data, fn) {
	var self = this;
	debug(data);
	this.userStore.exists(
		new RegExp(`^${data.username}$`, "i"),
		data.domain,
		function(er, exists) {
			if (er) return fn(er);
			if (exists) return fn(new Error("user already exists"));
			encrypt(data.password, function(er, hash) {
				if (er) return fn(er);
				data.password = hash;
				self.userStore.save(data, true, fn);
			});
		}
	);
};

/**
 * Creates a new role
 * @param  {Object}   data role information
 * @param  {Function} fn   callback
 * @return {Object}        Created Role
 */
UserManager.prototype.createRole = function(data, fn) {
	var self = this;
	this.roleStore.getRole(data.name, data.domain, function(er, exists) {
		if (er) return fn(er);
		if (exists) return fn(new Error("role already exists"));
		self.roleStore.save(data, fn);
	});
};

UserManager.prototype.updateRole = function(data, fn) {
	var self = this;
	this.roleStore.getRoleById(data._id, function(er, role) {
		if (er) return fn(er);
		if (!role) return fn(new Error("role does not exist"));
		var merged = localUtils.assign(role, data);
		self.roleStore.save(merged, fn);
	});
};

UserManager.prototype.updateUser = function(user, fn) {
	this.getUserById(user._id, (er, u) => {
		if (er) return fn(er);
		if (!u) return fn(new Error("User does not exist"));

		encrypt(user.password, (er, hash) => {
			if (er) return fn(er);
			user.password = hash;
			this.userStore.save(user, true, fn);
		});
	});
};

UserManager.prototype.addClaimToRole = function(name, domain, claims, fn) {
	var self = this;
	this.roleStore.getRole(name, domain, function(er, role) {
		if (er) return fn(er);
		if (!role) return fn(new Error("role does not exist"));
		//console.log(role.claims.length);
		role.claims = role.claims.concat(claims).map(function(x) {
			return x._id.toString();
		});
		//console.log(role.claims.length);
		self.roleStore.update(
			role._id,
			{
				$push: {
					claims: claims
				}
			},
			fn
		);
	});
};

/**
 * Verifies an accesstoken was issued by this service
 * @param  {String}   accessToken Access token to verify
 * @param  {Function} fn          callback
 * @return {Object}               result of verification. (varies depending on implementation of tokenGen).
 */
UserManager.prototype.verify = function(accessToken, fn) {
	try {
		var result = this.tokenGen.verify(accessToken);
		fn(null, result);
	} catch (e) {
		fn(e);
	}
};

UserManager.prototype.getRole = function(id, fn) {
	this.roleStore.getRoleById(id, fn);
};

UserManager.prototype.deleteUser = function(id, fn) {
	this.userStore.delete(id, fn);
};

UserManager.prototype.getUserById = function(id, fn) {
	this.userStore.getUserById(id, fn);
};

/**
 * Access control list (menu items)
 * @param  {String}   username Username
 * @param  {String}   domain   User's domain (Blank for global domain)
 * @param  {Function} fn       Callback
 * @return {Array}            List of Menus that match the search criteria.
 */
UserManager.prototype.acl = function(
	username,
	domain,
	client,
	category = "MAINMENU",
	fn
) {
	var self = this;
	if (Array.prototype.slice(arguments).length == 4) {
		fn = category;
		category = "MAINMENU";
	}
	this.userStore.getUser(username, domain, function(er, user) {
		if (er) return fn(er);
		if (!user) return fn(new Error("Could not find Items"));

		var claims = user.roles.reduce(function(z, b) {
			return z.concat(b.claims);
		}, user.claims || []);

		self.menuStore.getMenus(
			{
				client: {
					$in: [null, client, ""]
				},
				domain: { $in: [domain, null] },
				claims: {
					$in: claims
				},
				category: category,
				activated:true
			},
			fn
		);
	});
};

/**
 * This api is used by caller to return menu items that are reachable by everyone.
 * @param  {String}   domain   	Domain of the user calling
 * @param  {String}   client   	Client of the user calling
 * @param  {String}   category 	The type of menu to return eg. login menu (items to be displayed to user on the login page)
 * @param  {Function} fn       	Callback function
 * @return {Array}            	List of Menu items.
 */
UserManager.prototype.externalAcl = function(domain, client, category, fn) {
	this.menuStore.getMenus(
		{
			client: {
				$in: [null, client, ""]
			},
			category: category,
			domain: { $in: [domain, null] },
			claims: [],
			activated:true
		},
		fn
	);
};
UserManager.prototype.getRoles = function(query, options, fn) {
	this.roleStore.getRoles(query, options, fn);
};

/**
 * Get Menu details
 * @param  {String}   id Id of menu item
 * @param  {Function} fn Callback
 * @return {Object}      Menu Item.
 */
UserManager.prototype.getMenu = function() {
	this.menuStore.getMenu.apply(
		this.menuStore,
		Array.prototype.slice.call(arguments)
	);
};
UserManager.prototype.getDomains = function(query, fn) {
	debug(query);
	this.domainStore.get(query, fn);
};

UserManager.prototype.saveDomain = function(data, fn) {
	if (!data.name) {
		return setImmediate(fn, new Error("All domains must have valid names"));
	}
	this.domainStore.save(data, fn);
};
/**
 * Passthrough method for claimsStore.getClaims
 * @param  {Object}   query Search Criteria
 * @param  {Function} fn    Callback
 * @return {Array}         Result.
 */
UserManager.prototype.getClaims = function(query, fn) {
	this.claimsStore.get(query, fn);
};

UserManager.prototype.deleteClaim = function(id, fn) {
	this.claimsStore.delete({ _id: id }, fn);
};
/**
 * Passthrough method for claimsStore.saveClaim
 * @param  {Object}   data claim to save (type & value)
 * @param  {Function} fn    Callback
 * @return {Object}         Saved Object.
 */
UserManager.prototype.saveClaim = function(data, fn) {
	if (!data.type)
		return setImmediate(fn, new Error("All claims must have a type"));
	this.claimsStore.save(data, fn);
};
/**
 * Passthrough method for menuStore.saveMenu
 * @param  {Object}   data menu to save
 * @param  {Function} fn    Callback
 * @return {Object}         Saved Object.
 */
UserManager.prototype.saveMenu = function(data, fn) {
	this.menuStore.save(data, fn);
};
/**
 * Passthrough method for menuStore.getMenus
 * @param  {Object}   query Search Criteria
 * @param  {Function} fn    Callback
 * @return {Array}         Result.
 */
UserManager.prototype.getMenus = function(query, fn) {
	this.menuStore.getMenus(query, fn);
};

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
 * @param  {Function} fn    callback
 * @return {Object}         original data if successful, null if not.
 */
TokenGenerator.prototype.verify = function(token, fn) {
	return jwt.verify(token, this.secret, {
		audience: this.audience,
		issuer: this.issuer
	});
};

/**
 * Abstract Store
 * @param {String} name     Name of Model
 * @param {Object} schema   Schema of Object
 * @param {Object} mongoose Mongoose reference
 * @param {Object} conn     Mongoose connection
 */
function MongoStore(name, schema, mongoose, conn) {
	if (!mongoose || !conn || !name || !schema)
		throw new Error("mongoose is required by MongoStore");
	this.model = conn.model(name, new mongoose.Schema(schema));
}
MongoStore.prototype.save = function(data, fn) {
	if (!data._id) new this.model(data).save(fn);
	else {
		this.model.updateOne(
			{
				_id: data._id
			},
			data,
			fn
		);
	}
};
MongoStore.prototype.get = function(query, fn) {
	this.model
		.find(query)
		.lean()
		.exec(fn);
};

MongoStore.prototype.createOrUpdate = function(key, data, fn) {
	this.model.update(
		key,
		data,
		{
			upsert: true
		},
		fn
	);
};
MongoStore.prototype.getRange = function(query, count, fn) {
	var self = this;
	if (!count || typeof count !== "number") {
		fn(new Error("number of items to return must be greater than zero."));
		return;
	}
	var sort = !query._id || query._id.$lt ? -1 : 1;
	this.model
		.find(query)
		.sort({
			_id: sort
		})
		.limit(count)
		.lean()
		.exec(function(er, d) {
			if (er) return fn(er);

			self.model.count({}, function(er, c) {
				if (er) return fn(er);

				fn(null, {
					items: d,
					total: c
				});
			});
		});
};

MongoStore.prototype.delete = function(query, fn) {
	this.model.remove(query).exec(fn);
};

function getRangeAndTransform(query, count, fn) {
	var self = this;
	MongoStore.prototype.getRange.call(this, query, count, function(
		er,
		result
	) {
		if (er) return fn(er);

		transformAndSend.call(
			self,
			function(er, converted) {
				if (er) fn(er);
				result.items = converted;
				fn(null, result);
			},
			null,
			result.items
		);
	});
}

/**
 * User Store Class. Uses mongoose for persistence.
 * @param {Object} mongoose Connected mongoose client.
 */
function MongoDBUserStore(mongoose, conn) {
	if (!mongoose || !conn)
		throw new Error("user store requires an open mongoose connection");

	var Schema = mongoose.Schema;

	var userSchema = new Schema({
		username: {
			type: String,
			required: true
		},
		password: {
			type: String,
			required: true
		},
		domain: { type: Schema.Types.ObjectId, ref: "Domain" },
		roles: [
			{
				type: Schema.Types.ObjectId,
				ref: "Role"
			}
		],
		claims: [
			{
				type: Schema.Types.ObjectId,
				ref: "Claim"
			}
		]
	});
	this.connection = conn;
	this.transform = function(user) {
		return new User(user);
	};
	this.model = conn.model("User", userSchema);
}

MongoDBUserStore.prototype.init = function(expires_in, fn) {
	let col = this.connection.db.collection("refreshTokens");
	col.ensureIndex(
		{ createdAt: 1 },
		{ expireAfterSeconds: expires_in },
		er => {
			debug(er);
			if (er && er.code !== 85) return fn(er);
			fn();
		}
	);
};
/**
 * Stores a refreshtoken
 * @param  {String}   refreshTokenHash Refresh token
 * @param  {String}   clientId         Client ID
 * @param  {String}   username         Username
;
 * @param  {Function} fn               callback
 * @return {Object}                    newly created refreshtoken
 */
MongoDBUserStore.prototype.createRefreshToken = function(
	refreshTokenHash,
	username,
	clientId,
	domain,
	fn
) {
	let col = this.connection.db.collection("refreshTokens");
	col.insertOne(
		{
			refreshToken: refreshTokenHash,
			clientId: clientId,
			domain: domain,
			userId: username,
			createdAt: new Date()
		},
		fn
	);
};

/**
 * Returns a refresh token.
 * @param  {String}   refreshTokenHash tokenHash
 * @param  {String}   clientId         Client ID token was issued to
 * @param  {String}   username         Username token was issued to.
 * @param  {Function} fn               Callback
 * @return {Object}                    RefreshToken
 */
MongoDBUserStore.prototype.getRefreshToken = function(
	refreshTokenHash,
	clientId,
	domain,
	fn
) {
	this.connection.db.collection("refreshTokens").findOne(
		{
			refreshToken: refreshTokenHash,
			clientId: clientId,
			domain: domain
		},
		fn
	);
};

MongoDBUserStore.prototype.delete = function(id, fn) {
	this.model.remove({ _id: id }, fn);
};

/**
 * Saves a User
 * @param  {Object}   data            User to save
 * @param  {Boolean}   includePassword Include password hash in output
 * @param  {Function} fn              Callback
 * @return {Object}                   saved user
 */
MongoDBUserStore.prototype.save = function(data, includePassword, fn) {
	var self = this;
	if (!(data instanceof User)) {
		try {
			data = this.transform(data);
		} catch (e) {
			fn(e);
			return;
		}
	}

	var model = new this.model(data.getImage(includePassword));
	if (!data._id) {
		model.save(function(er, user) {
			if (er) return fn(er);

			model.populate("claims").populate(
				{
					path: "roles",
					populate: {
						path: "claims"
					}
				},
				transformAndSend.bind(self, fn)
			);
		});
		return;
	}

	this.model.findOneAndUpdate(
		{
			_id: data._id
		},
		{
			$set: data.getImage(includePassword)
		},
		{
			new: true
		},
		transformAndSend.bind(self, fn)
	);
};

/**
 * Returns all user details
 * @param  {String}   username username
 * @param  {Function} fn       Callback
 * @return {Object}            User
 */
MongoDBUserStore.prototype.getUser = function(username, domain, fn) {
	if (Array.prototype.slice.call(arguments).length == 2) {
		fn = domain;
		domain = null;
	}

	const query = function(q) {
		return Object.assign(q, {
			username: username
		});
	};
	this._getUser(query, domain, fn);
};

MongoDBUserStore.prototype._getUser = function(q, domain, fn) {
	var query = q({
		domain: domain
	});

	this.model
		.findOne(query)
		.populate("claims")
		.populate("roles")
		.populate({
			path: "roles",
			populate: {
				path: "claims"
			}
		})
		.exec(transformAndSend.bind(this, fn));
};

MongoDBUserStore.prototype.getUserById = function(id, domain, fn) {
	if (Array.prototype.slice.call(arguments).length == 2) {
		fn = domain;
		domain = null;
	}
	var query = function() {
		return { _id: id };
	};
	this._getUser(query, domain, fn);
};

/**
 * Queries for user.
 * @param  {Object}   query Object query
 * @param  {Function} fn    Callback
 * @return {Array}         List of users that match the query.
 */
MongoDBUserStore.prototype.getUsers = function(query, fn) {
	this.model.find(query, this.transformAndSend.bind(this, fn));
};

/**
 * Checks if user exists
 * @param  {String}   username Username
 * @param  {Function} fn       Callback
 * @return {Boolean}            indicates if user exists.
 */
MongoDBUserStore.prototype.exists = function(username, domain, fn) {
	this.model.findOne(
		{
			username: username,
			domain: domain
		},
		function(er, user) {
			if (er) return fn(er);
			return fn(null, !!user);
		}
	);
};

MongoDBUserStore.prototype.getRange = getRangeAndTransform;

/**
 * Role Store class. Keeps roles
 * @param {Object} mongoose Connected mongoose client.
 */
function MongoDBRoleStore(mongoose, conn) {
	if (!mongoose || !conn)
		throw new Error("role store requires an open mongoose connection");
	var Schema = mongoose.Schema;

	var roleSchema = new Schema({
		name: String,
		domain: { type: Schema.Types.ObjectId, ref: "Domain" },
		claims: [
			{
				type: Schema.Types.ObjectId,
				ref: "Claim"
			}
		]
	});
	this.model = conn.model("Role", roleSchema);
	this.transform = function(role) {
		return new Role(role);
	};
}

/**
 * Returns all the details of a role
 * @param  {String}   name Name of the role
 * @param  {Function} fn   Callback
 * @return {Object}        Role
 */
MongoDBRoleStore.prototype.getRole = function(name, domain, fn) {
	if (Array.prototype.slice.call(arguments).length == 2) {
		fn = domain;
		domain = undefined;
	}

	this.model
		.findOne({
			name: name,
			domain: domain
		})
		.populate("claims")
		.exec(transformAndSend.bind(this, fn));
};

MongoDBRoleStore.prototype.getRoleById = function(id, fn) {
	this.model
		.findOne({
			_id: id
		})
		.populate("claims")
		.exec(transformAndSend.bind(this, fn));
};
/**
 * Returns all roles that match search criteria
 * @param  {Object}   query Search Criteria
 * @param  {Function} fn    Callback
 * @return {Array}         List of objects that match search criteria
 */
MongoDBRoleStore.prototype.getRoles = function(query, options, fn) {
	if (
		Array.prototype.slice.call(arguments).length == 2 ||
		(!fn && Function.prototype.isPrototypeOf(options))
	) {
		fn = options;
		options = null;
	}
	let _query = this.model.find(query);

	if (options) {
		if (options.sort) {
			_query = _query.sort(options.sort);
		}
		if (options.limit) {
			_query.limit(options.limit);
		}
	}

	_query.exec(transformAndSend.bind(this, fn));
};

MongoDBRoleStore.prototype.countRoles = function(query, fn) {
	return this.model.count(query, fn);
};

MongoDBRoleStore.prototype.getRange = getRangeAndTransform;

/**
 * Creates or updates a role
 * @param  {Object}   data role info
 * @param  {Function} fn   Callback
 * @return {Object}        Saved role
 */
MongoDBRoleStore.prototype.save = function(data, fn) {
	var self = this;
	if (!(data instanceof Role)) {
		try {
			data = this.transform(data);
		} catch (e) {
			fn(e);
			return;
		}
	}
	var model = new this.model(data);
	if (!data._id) {
		model.save(function(er, role) {
			if (er) return fn(er);
			model.populate("claims", transformAndSend.bind(self, fn));
		});
		return;
	}

	this.model.update(
		{
			_id: data._id
		},
		data,
		function(er) {
			if (er) return fn(er);
			self.getRoleById(data._id, fn);
		}
	);
};

MongoDBRoleStore.prototype.update = function(id, data, fn) {
	var self = this;
	this.model.update(
		{
			_id: id
		},
		data,
		function(er) {
			if (er) return fn(er);
			self.getRoleById(id, fn);
		}
	);
};

/**
 * Menu item to be displayed by both the mobile and website.
 * @param {Object} opts Configuration object.
 */
function Menu(opts) {
	if (!opts) throw new Error("Menu item is missing configuration");

	if (!opts.displayLabel && !opts.icon) {
		// console.log(opts);
		// console.trace('an error is about to occur');
		throw new Error(
			"All menu items must either have a displayLabel or a display icon"
		);
	}

	if (!opts.type) throw new Error("All menu items require a valid type");

	if (!opts.category) throw new Error("All menu items must have a category");

	this.icon = opts.icon;
	this._id = opts._id;
	this.displayLabel = opts.displayLabel;
	this.claims = opts.claims || [];
	this.type = opts.type;
	this.value = opts.value;
	this.category = opts.category;
	this.client = opts.client;
	this.domain = opts.domain;
	this.group = opts.group;
	this.uid = opts.uid;
	this.home = opts.home;
	this.activated=opts.activated;
}

/**
 * MenuStore for retrieving and Creating menu items.
 * @param {Object} mongoose Connected Mongoose Client.
 */
function MongoMenuStore(mongoose, conn) {
	if (!mongoose || !conn)
		throw new Error("mongoose is required by MongoMenuStore");

	var Schema = mongoose.Schema;

	var menuSchema = new Schema({
		displayLabel: String,
		icon: String,
		client: String,
		type: {
			type: String,
			enum: ["DYNAMO", "CLIENT"],
			required: true
		},
		home: Boolean,
		uid: String,
		domain: { type: Schema.Types.ObjectId, ref: "Domain" },
		group: String,
		value: String,
		activated:Boolean,
		category: {
			type: String,
			required: true
		},
		claims: [
			{
				type: Schema.Types.ObjectId,
				ref: "Claim"
			}
		]
	});
	this.model = conn.model("Menu", menuSchema);
	this.transform = function(menu) {
		return new Menu(menu);
	};
}

/**
 * 
 * Create or update Menu Item
 * @param  {Object}   data Object or MenuItem class
 * @param  {Function} fn   Callback
 * @return {Object}        Saved object
 */
MongoMenuStore.prototype.save = function(data, fn) {
	var self = this;
	if (!(data instanceof Menu)) {
		try {
			data = this.transform(data);
		} catch (e) {
			return fn(e);
		}
	}

	var model = new this.model(data);
	if (!data._id) {
		model.save(function(er, menu) {
			if (er) return fn(er);
			model.populate("claims", transformAndSend.bind(self, fn));
		});
		return;
	}

	this.model.findOneAndUpdate(
		{
			_id: data._id
		},
		{
			$set: data
		},
		{
			new: true
		},
		transformAndSend.bind(self, fn)
	);
};

/**
 * Returns a list of Menus that match the search criteria
 * @param  {Object}   query Search Criteria
 * @param  {Function} fn    Callback
 * @return {Array}         List of menus
 */
MongoMenuStore.prototype.getMenus = function(query, fn) {
	this.model
		.find(query)
		.populate("claims")
		.exec(transformAndSend.bind(this, fn));
};

MongoMenuStore.prototype.getMenu = function(id, fn) {
	this.model
		.findOne({
			_id: id
		})
		.populate("claims")
		.exec(transformAndSend.bind(this, fn));
};

MongoMenuStore.prototype.getRange = getRangeAndTransform;

function MongoClaimsStore(mongoose, conn) {
	MongoStore.call(
		this,
		"Claim",
		{
			type: {
				type: String,
				required: true
			},
			description: {
				type: String,
				required: true
			},
			value: { type: String, unique: true, sparse: true }
		},
		mongoose,
		conn
	);
}

function MongoClientStore(mongoose, conn) {
	MongoStore.call(
		this,
		"Client",
		{
			clientId: {
				type: String,
				required: true
			},
			clientSecret: {
				type: String,
				required: true
			}
		},
		mongoose,
		conn
	);
}

function MongoDomainStore(mongoose, conn) {
	MongoStore.call(
		this,
		"Domain",
		{
			name: {
				type: String,
				required: true
			},
			uid: {
				type: String,
				unique: true,
				sparse: true
			},
			config: [
				{
					name: String,
					value: String
				}
			]
		},
		mongoose,
		conn
	);
}
utils.inherits(MongoClientStore, MongoStore);
utils.inherits(MongoClaimsStore, MongoStore);
utils.inherits(MongoDomainStore, MongoStore);

module.exports = {
	TokenGenerator: TokenGenerator,
	ClientStore: MongoClientStore,
	UserStore: MongoDBUserStore,
	DomainStore: MongoDomainStore,
	ClaimsStore: MongoClaimsStore,
	RoleStore: MongoDBRoleStore,
	UserManager: UserManager,
	MenuStore: MongoMenuStore,
	_MongoStore: MongoStore
};
