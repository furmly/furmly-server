const localUtils = require("./utilities"),
  bcrypt = require("bcrypt"),
  async = require("async"),
  debug = require("debug")("furmly-server:infrastructure"),
  crypto = require("crypto");

/**
 * Used to generate random base64 string
 * @param  {Number} len Length of string to generate
 * @return {String}     Random String
 */
function randomValueBase64(len) {
  return crypto
    .randomBytes(Math.ceil((len * 3) / 4))
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
 * This is the interface that systems outside the domain can interact with.
 * @class
 * @param {Object} opts Configuration object.(userStore,roleStore,claimsStore and tokenGen are compulsory)
 * @property {Object} config Configuration
 * @property {Object} constants Infrastructure constants
 */
function Infrastructure(opts) {
  if (!opts) throw new Error("Infrastructure configuration opts missing");

  if (!opts.userStore) throw new Error("Infrastructure must have a user store");

  if (!opts.roleStore) throw new Error("Infrastructure requires a role store");

  if (!opts.claimsStore)
    throw new Error("Infrastructure requires a claims store");

  if (!opts.tokenGen)
    throw new Error("Infrastructure requires a token generation strategy");

  if (!opts.scopedTokenGen)
    throw new Error(
      "Infrastructure requires a scoped token generation strategy"
    );

  if (!opts.menuStore) throw new Error("Infrastructure requires a menu store");

  if (!opts.clientStore)
    throw new Error("Infrastructure requires a clientStore");

  if (!opts.domainStore)
    throw new Error("Infrastructure requires a domainStore");

  if (!opts.migrationStore)
    throw new Error("Infrastructure requires a migrationStore");

  this.config = opts.config;
  this.scopedTokenGen = opts.scopedTokenGen;
  this.constants = Infrastructure.constants;
  this.userStore = opts.userStore;
  this.clientStore = opts.clientStore;
  this.claimsStore = opts.claimsStore;
  this.roleStore = opts.roleStore;
  this.tokenGen = opts.tokenGen;
  this.menuStore = opts.menuStore;
  this.domainStore = opts.domainStore;
  this.migrationStore = opts.migrationStore;
  this.adminClaims = localUtils.assign(
    {
      can_manage_claims: "can-manage-claims",
      can_manage_roles: "can-manage-roles",
      can_manage_menu: "can-manage-menus",
      can_manage_users: "can-manage-users",
      can_manage_domains: "can-manage-domains",
      can_manage_migrations: "can-manage-migrations"
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
  var groupName = "Furmly Administration",
    type = "CLIENT",
    category = "MAINMENU";
  this.adminMenus = {
    manage_migrations: {
      displayLabel: "Manage Migrations",
      icon: "description",
      client: this.webClient.clientId,
      category: category,
      type: type,
      uid: "manage_migrations",
      group: groupName,
      claim: this.adminClaims.can_manage_migrations
    },
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
}

Infrastructure.constants = {
  CLAIMS: {
    PROCESSOR: "http://www.furmly.com/processor",
    PROCESS: "http://www.furmly.com/process"
  }
};
/**
 * Setups up defaults ( user,roles,claims,menus )
 * @param  {String}   default_admin_username default admin username
 * @param  {String}   default_admin_password default admin password
 * @param  {Function} fn                     callback
 * @return {Object}                          returns an object when there is an error.
 */
Infrastructure.prototype.init = function(
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
      let difference = localUtils.difference(claims, role.claims, function(
        item,
        list
      ) {
        return !localUtils.contains(
          function(a, b) {
            return a.type == b.type;
          },
          item,
          list
        );
      });
      if (difference.length) {
        debugger;

        debug(`difference : ${JSON.stringify(difference, null, " ")}`);
        return self.addClaimToRole(self.defaultRole, null, difference, er => {
          if (er) return fn(er);
          role.claims = role.claims.concat(difference);
          fn(null, role);
        });
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
          debug("menus:");
          debug(menus);
          menus.forEach(function(x) {
            var request = self.adminMenus[x];
            debug(request);
            //debug(claims);
            request.claims = [
              claims.filter(function(z) {
                return z.type == request.claim;
              })[0]._id
            ];
            request.activated = true;
            tasks.push(self.saveMenu.bind(self, request));
          });

          debug("menu items to save:" + tasks.length);
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

    debug(
      `existing claims query:===\n${JSON.stringify(query, null, " ")}\n===\n`
    );
    this.claimsStore.get(
      {
        $or: query
      },
      function(er, res) {
        if (er) return fn(er);
        var tasks = [];
        debug(`result of query ${JSON.stringify(res, null, " ")}`);
        res.forEach(function(x) {
          if (claims.indexOf(x.type) !== -1) {
            return claims.splice(claims.indexOf(x.type), 1);
          }

          var filtered = claims.filter(
            v => v.type == x.type && v.value == x.value
          );
          if (filtered.length) claims.splice(claims.indexOf(filtered[0]), 1);
        });

        debug(`discovered new claims ? ${JSON.stringify(claims, null, " ")}`);
        claims.forEach(function(x) {
          tasks.push(function(callback) {
            debug("new claim to save");
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

/**
 * used to retrieve all the schemas
 * @param  {Function} fn Callback
 * @return {Array}      Array of schema objects.
 */
Infrastructure.prototype.getSchemas = function(fn) {
  let isStore = /(\w+)store/i,
    schemas = [];
  Object.keys(this).map(key => {
    if (isStore.test(key) && this[key].schema) {
      schemas.push(this[key].schema);
    }
  });
  return setImmediate(fn, null, schemas);
};
/**
 * Check if user belongs to roleName
 * @param  {String} roleName Name of the Role
 * @param  {Object} user     User Object
 * @return {Boolean}          Returns true if user is in role.[note it does not fetch the user from persistence]
 */
Infrastructure.prototype.inRole = function(roleName, user) {
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
    className: "Migration",
    storeName: "migrationStore"
  },
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
  Infrastructure.prototype["get" + x.className + "Range"] = function() {
    this[x.storeName].getRange.apply(
      this[x.storeName],
      Array.prototype.slice.call(arguments)
    );
  };
});

Infrastructure.prototype.generateScopedToken = function(scope, data, exp) {
  // body...
  return this.scopedTokenGen.sign(
    scope,
    data,
    Math.floor(Date.now() / 1000) + exp
  );
};

Infrastructure.prototype.verifyScopedToken = function(scope, token) {
  // body...
  return this.scopedTokenGen.verify(scope, token);
};
/**
 * Login user using password.
 * @param  {String}   client   client making the request on the users behalf
 * @param  {String}   username username
 * @param  {String}   password the user's password
 * @param  {Function} fn       callback
 * @return {Object}            returns access_token,refresh_token and expiry date of access_token
 */
Infrastructure.prototype.login = function(
  domain,
  client,
  username,
  password,
  fn
) {
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
Infrastructure.prototype.refreshToken = function(
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

/**
 * Check passwords match
 * @param  {String}   domain   User's domain
 * @param  {String}   username Username
 * @param  {String}   password Password to check in clear text
 * @param  {Function} fn       Callback
 *
 */
Infrastructure.prototype.checkPassword = function(
  domain,
  username,
  password,
  fn
) {
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

/**
 * Change the users password.
 * @param  {String}   username    Username
 * @param  {String}   domain      Domain of the user
 * @param  {String}   password    Current password
 * @param  {String}   newPassword New password
 * @param  {Function} fn          Callback
 *
 */
Infrastructure.prototype.changePassword = function(
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
      update.changedPassword = (update.changedPassword || 0) + 1;
      update.lastPasswordChange = new Date();
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
Infrastructure.prototype.getUser = function(username, domain, fn) {
  this.userStore.getUser(username, domain, fn);
};

/**
 * Get users by param
 * @param {Object} query Object
 * @param {Function} fn Callback
 */
Infrastructure.prototype.getUsersByParam = function(query, fn) {
  this.userStore.getUsers(query, fn);
};

/**
 * Registers a new user
 * @param  {Object}   data user info, which includes username ,password and role
 * @param  {Function} fn   callback
 * @return {Object}        Created User.
 */
Infrastructure.prototype.register = function(data, fn) {
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
Infrastructure.prototype.createRole = function(data, fn) {
  var self = this;
  this.roleStore.getRole(data.name, data.domain, function(er, exists) {
    if (er) return fn(er);
    if (exists) return fn(new Error("role already exists"));
    self.roleStore.save(data, fn);
  });
};

/**
 * Updates an existing role
 * @param  {Object}   data Existing role [must include the _id of the role]
 * @param  {Function} fn   Callback
 *
 */
Infrastructure.prototype.updateRole = function(data, fn) {
  var self = this;
  this.roleStore.getRoleById(data._id, function(er, role) {
    if (er) return fn(er);
    if (!role) return fn(new Error("role does not exist"));
    var merged = localUtils.assign(role, data);
    self.roleStore.save(merged, fn);
  });
};

/**
 * Updates an existing user
 * @param  {Object}   user Existing user
 * @param  {Function} fn   Callback
 *
 */
Infrastructure.prototype.updateUser = function(user, fn) {
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

/**
 * Adds a claim to the supplied role
 * @param {String}   name   Role
 * @param {String}   domain Domain
 * @param {String[]}   claims List of claims
 *
 */
Infrastructure.prototype.addClaimToRole = function(name, domain, claims, fn) {
  var self = this;
  this.roleStore.getRole(name, domain, function(er, role) {
    if (er) return fn(er);
    if (!role) return fn(new Error("role does not exist"));

    self.roleStore.update(
      role._id,
      {
        $push: {
          claims: {
            $each: (Array.prototype.isPrototypeOf(claims) && claims) || [claims]
          }
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
Infrastructure.prototype.verify = function(accessToken, fn) {
  try {
    var result = this.tokenGen.verify(accessToken);
    fn(null, result);
  } catch (e) {
    fn(e);
  }
};

/**
 * Retrieves a role by Id
 * @param  {String|ObjectId}   id Role Id
 * @param  {Function} fn Callback
 *
 */
Infrastructure.prototype.getRole = function(id, fn) {
  this.roleStore.getRoleById(id, fn);
};
/**
 * Deletes an existing user by Id
 * @param  {String|ObjectId}   id - User id
 * @param  {Function} fn Callback
 *
 */
Infrastructure.prototype.deleteUser = function(id, fn) {
  this.userStore.delete(id, fn);
};

/**
 * Retrieves a user by id
 * @param  {String|ObjectId}   id - User id
 * @param  {Function} fn Callback
 *
 */
Infrastructure.prototype.getUserById = function(id, fn) {
  this.userStore.getUserById(id, fn);
};

Infrastructure.prototype.getMigrationById = function(id, fn) {
  this.migrationStore.getById(id, fn);
};

Infrastructure.prototype.saveMigration = function(data, context, fn) {
  this.migrationStore.save(data, context, fn);
};

/**
 * Access control list (menu items)
 * @param  {String}   username Username
 * @param  {String}   domain   User's domain (Blank for global domain)
 * @param  {Function} fn       Callback
 * @return {Array}            List of Menus that match the search criteria.
 */
Infrastructure.prototype.acl = function(
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
    if (!user) return fn(new Error("Could not find user"));

    var claims = user.roles.reduce(function(z, b) {
      return z.concat(b.claims);
    }, user.claims || []);

    self.menuStore
      .getMenusExt({
        client: {
          $in: [null, client, ""]
        },
        domain: { $in: [domain, null] },
        claims: {
          $in: claims
        },
        category: category,
        activated: true
      })
      .select({
        activated: 0,
        claims: 0,
        domain: 0
      })
      .lean()
      .exec(fn);
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
Infrastructure.prototype.externalAcl = function(domain, client, category, fn) {
  this.menuStore
    .getMenusExt({
      client: {
        $in: [null, client, ""]
      },
      category: category,
      domain: { $in: [domain, null] },
      claims: [],
      activated: true
    })
    .select({
      activated: 0,
      claims: 0,
      domain: 0
    })
    .lean()
    .exec(fn);
};
/**
 * Retrieves roles that match the query
 * @param  {Object}   query   Filter
 * @param  {Object}   options Optional
 * @param  {Function} fn      Callback
 *
 */
Infrastructure.prototype.getRoles = function(query, options, fn) {
  this.roleStore.getRoles(query, options, fn);
};

/**
 * Get Menu details
 * @param  {String}   id Id of menu item
 * @param  {Function} fn Callback
 * @return {Object}      Menu Item.
 */
Infrastructure.prototype.getMenu = function() {
  this.menuStore.getMenu.apply(
    this.menuStore,
    Array.prototype.slice.call(arguments)
  );
};
/**
 * Get Domains that match query
 * @param  {Object}   query Filter
 * @param  {Function} fn    Callback
 *
 */
Infrastructure.prototype.getDomains = function(query, fn) {
  debug(query);
  this.domainStore.get(query, fn);
};

/**
 * Create/Update a domain
 * @param  {Object}   data Domain information
 * @param  {Function} fn   Callback
 *
 */
Infrastructure.prototype.saveDomain = function(data, fn) {
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
Infrastructure.prototype.getClaims = function(query, fn) {
  this.claimsStore.get(query, fn);
};

/**
 * Delete an existing claim
 * @param  {String}   id Id of the claim to delete
 * @param  {Function} fn Callback
 *
 */
Infrastructure.prototype.deleteClaim = function(id, fn) {
  this.claimsStore.delete({ _id: id }, fn);
};
/**
 * Passthrough method for claimsStore.saveClaim
 * @param  {Object}   data claim to save (type & value)
 * @param  {Function} fn    Callback
 * @return {Object}         Saved Object.
 */
Infrastructure.prototype.saveClaim = function(data, fn) {
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
Infrastructure.prototype.saveMenu = function(data, fn) {
  this.menuStore.save(data, fn);
};
/**
 * Passthrough method for menuStore.getMenus
 * @param  {Object}   query Search Criteria
 * @param  {Function} fn    Callback
 * @return {Array}         Result.
 */
Infrastructure.prototype.getMenus = function(query, fn) {
  this.menuStore.getMenus(query, fn);
};

module.exports = Infrastructure;
