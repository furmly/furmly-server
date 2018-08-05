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
			value: { type: String, unique: true, sparse: true }
		},
		mongoose,
		conn
	);
}
utils.inherits(MongoClaimsStore, MongoStore);
module.exports = MongoClaimsStore;
