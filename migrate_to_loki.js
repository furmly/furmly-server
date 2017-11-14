const loki = require("lokijs"),
	MongoClient = require("mongodb").MongoClient,
	path=require('path'),
	config = require("./config")[
		process.env.profile || "dev"
	],
	lfsa = require("./node_modules/lokijs/src/loki-fs-structured-adapter"),
	ent = [
		{ col: "_0processors", loki: "_0Processor" },
		{ col: "_0processes", loki: "_0Process" },
		{ col: "_0asyncvalidators", loki: "_0AsyncValidator" },
		{ col: "_0libs", loki: "_0Lib" },
		{ col: "_0steps", loki: "_0Step" }
	];
	//console.log(config);
var adapter = new lfsa();
var loc=path.normalize(`${__dirname}/system-entities/Dynamo.db`);
console.log(loc);
var db = new loki(loc, {
	adapter,
	autoload: true,
	autoloadCallback: databaseInitialize,
	autosave: true,
	autosaveInterval: 100
});

function databaseInitialize() {
	MongoClient.connect(config.data.dynamo_url, (err, _db) => {
		if (err) throw err;
		ent.forEach(e => {
			_db
				.collection(e.col)
				.find({})
				.toArray((er, entities) => {
					if (er) return console.log(er), process.exit(1);

					//console.log(entities);
					saveEntity(e.loki, entities);
				});
		});
	});
}

function saveEntity(name, entities) {
	let log = db.getCollection(name);

	if (log === null) {
		log = db.addCollection(name, { unique: ["_id"] });
		// log some random event data as part of our example
		return log.insert(entities);
	}

	console.log(
		log
			.chain()
			.find({ uid: { $in: ["convertFilter"] } })
			.data().length
	);
}
