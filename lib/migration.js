const debug = require("debug")("migration"),
	async = require("async"),
	path = require("path"),
	sanitize = require("sanitize-filename"),
	fs = require("fs-extra");
function Migration(opts, config, itemResolutionStrategy) {
	debug(config);
	debug(opts.dbs);
	if (!opts.title) throw new Error("All migrations must have titles");
	if (!opts.dbs) throw new Error("Empty migration");
	if (!config.folder) throw new Error("Missing migration folder");
	if (!itemResolutionStrategy) throw new Error("Missing item resolution");

	this.title = opts.title;
	this._id = opts._id;
	this.dbs = opts.dbs;
	Object.defineProperties(this, {
		migrationFolder: {
			enumerable: false,
			get: function() {
				return config.folder;
			}
		},
		itemResolutionStrategy: {
			enumerable: false,
			get: function() {
				return itemResolutionStrategy;
			}
		}
	});
}

Migration.prototype.getMigrationFolder = function() {
	return path.join(
		__dirname,
		`${this.migrationFolder}/${sanitize(this.title)}`
	);
};

/**
 * This generates the migration package.
 * @param  {Function} fn Callback function
 * @return {String}                Message
 */
Migration.prototype.generate = function(fn) {
	debug("generating migration package...");
	let tasks = [],
		migrationFolder = this.getMigrationFolder();
	fs.remove(migrationFolder, er => {
		if (er) return debug("error occurred while removing folder"), fn(er);
		fs.ensureDirSync(migrationFolder);
		fs.ensureDirSync(path.join(migrationFolder, "./docs/"));
		debug("looping over database files");
		this.dbs.forEach(db => {
			tasks.push(callback => {
				debug(`migrationFolder:${migrationFolder}`);
				let dbPath = path.join(migrationFolder, "./docs/", db.name);
				debug(`dbPath:${dbPath}`);
				fs.ensureDirSync(dbPath);
				let collectionTasks = [];
				db.collections.forEach(collection => {
					collectionTasks.push(colCallback => {
						let filter =
							(collection.items &&
							collection.items.length && {
								_id: { $in: collection.items }
							}) ||
							{};
						this.itemResolutionStrategy(
							db,
							collection,
							filter,
							colCallback
						);
					});
				});

				async.parallel(collectionTasks, (er, results) => {
					if (er)
						return (
							debug(
								"error occurred while performing collectionTasks"
							),
							callback(er)
						);
					let writeTasks = results.map((result, index) => {
						return writeCallback => {
							let writePath = path.join(
								dbPath,
								db.collections[index].name + ".json"
							);
							debug(
								"writing file ..." + db.collections[index].name
							);
							debug(`write path:${writePath}`);
							fs.writeJson(writePath, result, writeCallback);
						};
					});

					async.parallel(writeTasks, callback);
				});
			});
		});

		async.parallel(tasks, er => {
			if (er)
				return (
					debug("error occurred during migration"), debug(er), fn(er)
				);
			debug("finished copying data ... moving supporting files");
			fs.copySync(
				path.join(__dirname, "./migration_script.js"),
				`${migrationFolder}/script.js`
			);
			fs.copySync(
				path.join(__dirname, "./utilities.js"),
				`${migrationFolder}/utils.js`
			);
			fs.copySync(
				path.join(__dirname, "./migration_libs"),
				migrationFolder
			);
			return fn(null, "successfully generated migration package");
		});
	});
};

module.exports = Migration;