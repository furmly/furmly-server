const utils = require("util"),
  Menu = require("../models/menu"),
  MongoStore = require("./store");

/**
 * MenuStore for retrieving and Creating menu items.
 * @param {Object} mongoose Connected Mongoose Client.
 */
function MongoMenuStore(mongoose, conn) {
  MongoStore.call(
    this,
    "Menu",
    {
      displayLabel: String,
      icon: String,
      client: { type: String, ref: "Client" },
      type: {
        type: String,
        enum: ["FURMLY", "CLIENT"],
        required: true
      },
      home: Boolean,
      uid: String,
      domain: { type: mongoose.Schema.Types.ObjectId, ref: "Domain" },
      group: String,
      value: String,
      activated: Boolean,
      category: {
        type: String,
        required: true
      },
      params: String,
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
    model.save(function(er) {
      if (er) return fn(er);
      model.populate("claims", self.transformAndSend.bind(self, fn));
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
    this.transformAndSend.bind(self, fn)
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
    .lean()
    .exec(this.transformAndSend.bind(this, fn));
};

MongoMenuStore.prototype.getMenusExt = function(query) {
  return this.model.find(query);
};

MongoMenuStore.prototype.getMenu = function(id, fn) {
  this.model
    .findOne({
      _id: id
    })
    .populate("claims")
    .lean()
    .exec(this.transformAndSend.bind(this, fn));
};

//MongoMenuStore.prototype.getRange = getRangeAndTransform;
utils.inherits(MongoMenuStore, MongoStore);
module.exports = MongoMenuStore;
