const utils = require("util"),
	MongoStore = require("./store");
function MigrationStore(mongoose, conn) {
	MongoStore.call(
		this,
		"Migration",
		{
			title: {
				type: String,
				required: true
			},
			dbs: [
				{
					name: String,
					collections: [
						{
							name: String,
							type: String,
							items: [{ type: mongoose.Schema.Types.ObjectId }]
						}
					]
				}
			]
		},
		mongoose,
		conn
	);
}

utils.inherits(MigrationStore, MongoStore);

module.exports = MigrationStore;
