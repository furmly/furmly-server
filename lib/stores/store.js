const debug = require("debug")("store");
const assert = require("assert");
/**
 * Abstract Store
 * @param {String} name     Name of Model
 * @param {Object} schema   Schema of Object
 * @param {Object} mongoose Mongoose reference
 * @param {Object} conn     Mongoose connection
 */
function MongoStore(name, schema, mongoose, conn) {
  if (!mongoose || !conn || !name || !schema)
    throw new Error("mongoose/connection is required by MongoStore");
  this.model = conn.model(name, new mongoose.Schema(schema));
  this.schema = { name, schema };
  this.connection = conn;
}
MongoStore.prototype.save = function(data, fn) {
  if (this.transform) {
    try {
      data = this.transform(data);
    } catch (e) {
      return setImmediate(fn, e);
    }
  }
  let _continue = (er, ...rest) => {
    if (er) return fn(er);
    if (this.transform) return fn(null, data);
    return fn.apply(null, [null].concat(rest));
  };
  if (!data._id) new this.model(data).save(_continue);
  else {
    this.model.updateOne(
      {
        _id: data._id
      },
      data,
      _continue
    );
  }
};
MongoStore.prototype.get = function(query, fn) {
  this.model
    .find(query)
    .lean()
    .exec(fn);
};

/**
 * Function for transforming query result
 * @param  {Function} fn callback
 * @param  {Object}   er Error
 * @param  {Object}   x  Result to transform
 * @return {Object}      Transformed result
 */
MongoStore.prototype.transformAndSend = function(fn, er, x) {
  assert.strictEqual(typeof fn == "function", true);
  if (er) return fn(er);
  if (x) {
    if (x instanceof Array) {
      x = x.map(this.transform);
    } else {
      x = this.transform(x);
    }
  }

  return fn(null, x);
};

MongoStore.prototype.createOrUpdate = function(key, data, fn) {
  this.model.updateOne(
    key,
    data,
    {
      upsert: true
    },
    fn
  );
};
MongoStore.prototype.getRange = function(query, count, select, fn) {
  if (Array.prototype.slice.call(arguments).length == 3) {
    fn = select;
    select = null;
  }
  if (!count || typeof count !== "number") {
    fn(new Error("number of items to return must be greater than zero."));
    return;
  }
  debug(query);
  var sort = !query._id || query._id.$lt ? -1 : 1;
  let _run = this.model
    .find(query)
    .sort({
      _id: sort
    })
    .limit(count)
    .lean();

  if (select) _run = _run.select(select);
  _run.exec((er, d) => {
    if (er) return fn(er);

    let countquery = Object.assign({}, query);

    if (countquery._id) {
      delete countquery._id;
    }
    this.model.count(countquery, (er, c) => {
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

MongoStore.prototype.count = function(query = {}, fn) {
  this.model.count(query, fn);
};

MongoStore.prototype.getRangeAndTransform = function(query, count, fn) {
  var self = this;
  MongoStore.prototype.getRange.call(this, query, count, (er, result) => {
    if (er) return fn(er);

    this.transformAndSend.call(
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
};
MongoStore.prototype.getById = function(query, fn) {
  this.model.findOne(query, fn);
};

module.exports = MongoStore;
