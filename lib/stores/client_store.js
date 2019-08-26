const utils = require("util"),
  MongoStore = require("./store");
function MongoClientStore(mongoose, conn) {
  MongoStore.call(
    this,
    "Client",
    {
      _id: {
        type: String,
        required: true
      },
      name: {
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
utils.inherits(MongoClientStore, MongoStore);

MongoClientStore.prototype.save = function(data, fn) {
  this.model.updateOne(
    {
      _id: data._id
    },
    data,
    { upsert: true },
    (er, ...rest) => {
      if (er) return fn(er);
      return fn.apply(null, [null].concat(rest));
    }
  );
};
module.exports = MongoClientStore;
