const utils = require("util"),
	Migration = require("migration"),
	MongoStore = require("./store");
function MigrationStore(mongoose, conn, config, stores) {
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
	this.transform = function(item) {
		return new Migration(item, config, stores);
	};
}

utils.inherits(MigrationStore, MongoStore);

module.exports = MigrationStore;
