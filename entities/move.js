const MongoClient = require("mongodb").MongoClient;
const assert = require("assert"),
	path = require("path"),
	fs = require("fs"),
	glob = require("glob");

// Connection URL
const url = "mongodb://localhost:27017/dynamo";

// Database Name
const dbName = "dynamo";

// Use connect method to connect to the server
MongoClient.connect(url, function(err, client) {
	assert.equal(null, err);
	console.log("Connected successfully to server");

	const db = client.db(dbName);

	glob("*.json", (er, items) => {
		db.collection("schemas").insertMany(items.map(x => {
			let collectionName = path.basename(x, path.extname(x));
			console.log(x);
			let schema = JSON.parse(fs.readFileSync(x));
			return {
				name: collectionName,
				schema
			};
		}), er => {
			if (er) return client.close(), console.log(er), process.exit(1);

			return console.log("successful"), process.exit(0);
		});
	});
});
