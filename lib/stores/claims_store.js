const utils = require("util"),
  MongoStore = require("./store");
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
      value: { type: String }
    },
    mongoose,
    conn
  );
  this.model.schema.index({ type: 1, value: 1 }, { unique: true });
}
utils.inherits(MongoClaimsStore, MongoStore);
module.exports = MongoClaimsStore;
