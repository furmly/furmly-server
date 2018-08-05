const utils = require("util"),
  MongoStore = require("./store");
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
      image: {
        type: mongoose.Schema.Types.ObjectId
      },
      logo: {
        type: mongoose.Schema.Types.ObjectId
      },
      config: [
        {
          name: String,
          value: String
        }
      ],
      public: [
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

utils.inherits(MongoDomainStore, MongoStore);

module.exports = MongoDomainStore;
