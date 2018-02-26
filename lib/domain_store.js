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

utils.inherits(MongoDomainStore, MongoStore);

module.exports = MongoDomainStore;
