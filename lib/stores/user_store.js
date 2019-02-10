const debug = require("debug")("user-store"),
  utils = require("util"),
  User = require("../models/user"),
  MongoStore = require("./store");

/**
 * User Store Class. Uses mongoose for persistence.
 * @param {Object} mongoose Connected mongoose client.
 */
function MongoDBUserStore(mongoose, conn) {
  MongoStore.call(
    this,
    "User",
    {
      username: {
        type: String,
        required: true
      },
      changedPassword: {
        type: Number,
        default: 0
      },
      lastPasswordChange: {
        type: Date
      },
      password: {
        type: String,
        required: true
      },
      domain: { type: mongoose.Schema.Types.ObjectId, ref: "Domain" },
      roles: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Role"
        }
      ],
      claims: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Claim"
        }
      ]
    },
    mongoose,
    conn
  );
  this.transform = function(user) {
    return new User(user);
  };
  this.getRange = this.getRangeAndTransform;
}

MongoDBUserStore.prototype.init = function(expires_in, fn) {
  let col = this.connection.db.collection("refreshTokens");
  col.ensureIndex({ createdAt: 1 }, { expireAfterSeconds: expires_in }, er => {
    debug(er);
    if (er && er.code !== 85) return fn(er);
    fn();
  });
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
    model.save(function(er) {
      if (er) return fn(er);

      model.populate("claims").populate(
        {
          path: "roles",
          populate: {
            path: "claims"
          }
        },
        self.transformAndSend.bind(self, fn)
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
    this.transformAndSend.bind(self, fn)
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
    .lean()
    .exec(this.transformAndSend.bind(this, fn));
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

utils.inherits(MongoDBUserStore, MongoStore);
module.exports = MongoDBUserStore;
