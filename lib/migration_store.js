const utils = require("util"),
	Migration = require("./migration"),
	MongoStore = require("./store");
function MigrationStore(mongoose, conn, config, itemResolutionStrategy) {
	MongoStore.call(
		this,
		"Migration",
		{
			title: {
				type: String,
				unique: true,
				required: true
			},
			dbs: [
				{
					name: String,
					collections: [
						{
							name: String,
							items: [{ type: mongoose.Schema.Types.Mixed }]
						}
					]
				}
			]
		},
		mongoose,
		conn
	);
	this.transform = function(item) {
		if (Migration.prototype.isPrototypeOf(item)) return item;
		return new Migration(item, config, itemResolutionStrategy);
	};
}

MigrationStore.prototype.getRange = function(...args) {
	args.splice(2, 0, { dbs: 0 });
	MongoStore.prototype.getRange.apply(this, args);
};

MigrationStore.prototype.save = function(data, context, fn) {
	MongoStore.prototype.save.call(this, data, (er, migration) => {
		if (er) return fn(er);
		migration.generate(context, fn);
	});
};
utils.inherits(MigrationStore, MongoStore);

module.exports = MigrationStore;
