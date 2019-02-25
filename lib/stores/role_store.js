const utils = require("util"),
  Role = require("../models/role"),
  MongoStore = require("./store");

/**
 * Role Store class. Keeps roles
 * @param {Object} mongoose Connected mongoose client.
 */
function MongoDBRoleStore(mongoose, conn) {
  MongoStore.call(
    this,
    "Role",
    {
      name: String,
      description: String,
      domain: { type: mongoose.Schema.Types.ObjectId, ref: "Domain" },
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
  this.transform = function(role) {
    return new Role(role);
  };
  this.getRange = this.getRangeAndTransform;
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
    .lean()
    .exec(this.transformAndSend.bind(this, fn));
};

MongoDBRoleStore.prototype.getRoleById = function(id, fn) {
  this.model
    .findOne({
      _id: id
    })
    .populate("claims")
    .lean()
    .exec(this.transformAndSend.bind(this, fn));
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

  _query.lean().exec(this.transformAndSend.bind(this, fn));
};

MongoDBRoleStore.prototype.countRoles = function(query, fn) {
  return this.model.count(query, fn);
};

//MongoDBRoleStore.prototype.getRange = getRangeAndTransform;

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
    model.save(function(er) {
      if (er) return fn(er);
      model.populate("claims", self.transformAndSend.bind(self, fn));
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

utils.inherits(MongoDBRoleStore, MongoStore);
module.exports = MongoDBRoleStore;
