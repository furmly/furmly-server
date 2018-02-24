const utils = require("util"),
	MongoStore = require("./store");
function MongoClientStore(mongoose, conn) {
	MongoStore.call(
		this,
		"Client",
		{
			clientId: {
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
module.exports = MongoClientStore;
