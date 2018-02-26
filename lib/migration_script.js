const mongodb = require("mongodb"),
	MongoClient = mongodb.MongoClient,
	ObjectID = mongodb.ObjectID,
	path = require("path"),
	http = require("http"),
	fs = require("fs"),
	opn = require("opn"),
	utils = require("./utils"),
	diff_match_patch = require("./diff_match_patch_u"),
	dmp = new diff_match_patch.diff_match_patch();
const isLeft = /\{\$\$left\}/,
	isRight = /\{\$\$right\}/,
	isID = /\{\$\$_id\}/;

const isDirectory = source => fs.lstatSync(source).isDirectory();
const getDirectories = (source, fn) =>
		fs.readdir(source, (er, dirs) => {
			if (er) return fn(er);
			fn(
				null,
				dirs.map(name => path.join(source, name)).filter(isDirectory)
			);
		}),
	getFiles = (source, fn) => {
		fs.readdir(source, (er, dirs) => {
			if (er) return fn(er);
			fn(
				null,
				dirs.map(name => path.join(source, name)).filter(x => {
					return !isDirectory(x);
				})
			);
		});
	};

/*!
 * Produces a collection name from model `name`.
 *
 * @param {String} name a model name
 * @return {String} a collection name
 * @api private
 */

function toCollectionName(name, options) {
	options = options || {};
	if (name === "system.profile") {
		return name;
	}
	if (name === "system.indexes") {
		return name;
	}
	return pluralize(name.toLowerCase());
}

/**
 * Pluralization rules.
 *
 * These rules are applied while processing the argument to `toCollectionName`.
 *
 * @deprecated remove in 4.x gh-1350
 */

let rules = [
	[/(m)an$/gi, "$1en"],
	[/(pe)rson$/gi, "$1ople"],
	[/(child)$/gi, "$1ren"],
	[/^(ox)$/gi, "$1en"],
	[/(ax|test)is$/gi, "$1es"],
	[/(octop|vir)us$/gi, "$1i"],
	[/(alias|status)$/gi, "$1es"],
	[/(bu)s$/gi, "$1ses"],
	[/(buffal|tomat|potat)o$/gi, "$1oes"],
	[/([ti])um$/gi, "$1a"],
	[/sis$/gi, "ses"],
	[/(?:([^f])fe|([lr])f)$/gi, "$1$2ves"],
	[/(hive)$/gi, "$1s"],
	[/([^aeiouy]|qu)y$/gi, "$1ies"],
	[/(x|ch|ss|sh)$/gi, "$1es"],
	[/(matr|vert|ind)ix|ex$/gi, "$1ices"],
	[/([m|l])ouse$/gi, "$1ice"],
	[/(kn|w|l)ife$/gi, "$1ives"],
	[/(quiz)$/gi, "$1zes"],
	[/s$/gi, "s"],
	[/([^a-z])$/, "$1"],
	[/$/gi, "s"]
];

/**
 * Uncountable words.
 *
 * These words are applied while processing the argument to `toCollectionName`.
 * @api public
 */

let uncountables = [
	"advice",
	"energy",
	"excretion",
	"digestion",
	"cooperation",
	"health",
	"justice",
	"labour",
	"machinery",
	"equipment",
	"information",
	"pollution",
	"sewage",
	"paper",
	"money",
	"species",
	"series",
	"rain",
	"rice",
	"fish",
	"sheep",
	"moose",
	"deer",
	"news",
	"expertise",
	"status",
	"media"
];

/*!
 * Pluralize function.
 *
 * @author TJ Holowaychuk (extracted from _ext.js_)
 * @param {String} string to pluralize
 * @api private
 */

function pluralize(str) {
	var found;
	if (!~uncountables.indexOf(str.toLowerCase())) {
		found = rules.filter(function(rule) {
			return str.match(rule[0]);
		});
		if (found[0]) {
			return str.replace(found[0][0], found[0][1]);
		}
	}
	return str;
}

const url = "mongodb://localhost:27017/";

let serverStarted = false,
	isJs = /\.js$/i,
	isCss = /\.css$/i,
	contentType = {
		".js": "text/javascript; charset=UTF-8",
		".css": "text/css"
	},
	index =
		"<html>" +
		"<head>" +
		"<title>Merge Conflicts</title>" +
		"<link rel='stylesheet' href='./styles.css' >" +
		"<script src='./jquery.min.js'  ></script>" +
		"<script src='./diff_match_patch.js' ></script>" +
		"</head>" +
		"<body>" +
		"<div id='flex-container'>" +
		"<input id='_id' type='hidden' value='{$$_id}'/>" +
		"<div><button class='merge-button' onClick='return resolve(\"left\")'>Merge left</button><div id='acediff-left-editor' >" +
		"{$$left}</div></div>" +
		"<div id='acediff-gutter'></div>" +
		"<div><button class='merge-button' onClick='return resolve(\"right\")'>Merge right</button><div id='acediff-right-editor' >" +
		"{$$right}</div></div>" +
		"</div>" +
		'<script src="./ace.js" type="text/javascript" charset="utf-8"></script>' +
		"<script src='./ace-diff.js' ></script>" +
		"<script>{indexScript}</script>" +
		"</body>" +
		"</html>",
	conflicts = {};

function read(stream, fn) {
	let data = "";
	stream.on("data", str => {
		data += str;
	});
	stream.on("end", () => {
		try {
			data = JSON.parse(data);
		} catch (e) {
			fn(e);
		}
		fn(null, data);
	});
}
function indexScript() {
	var editor;
	$(function() {
		editor = new AceDiff({
			mode: "ace/mode/javascript",
			theme: "ace/theme/monokai"
		});
	});

	function resolve(selector) {
		if (window.confirm("Do you want to merge those files ?")) {
			var ed = editor.editors[selector].ace.getValue();
			$.ajax({
				url: "/resolve",
				method: "POST",
				contentType: "application/json",
				success: function(result, status) {
					location.reload();
				},
				error: function() {
					alert("request failed");
				},
				data: JSON.stringify({ result: ed, id: $("#_id").val() })
			});
		}
		return false;
	}
}
function getIndex() {
	var entire = indexScript.toString(),
		indexClone = "" + index,
		currentConflicts;
	if ((currentConflicts = Object.keys(conflicts)).length > 0) {
		let _c = conflicts[currentConflicts[0]],
			existing = JSON.stringify(_c.existing, null, " "),
			imported = JSON.stringify(_c.imported, null, " ");

		if (_c.hasCode && !_c.mergedCode) {
			existing = _c.existing.code;
			imported = _c.imported.code;
		}

		indexClone = indexClone
			.replace(isLeft, imported)
			.replace(isRight, existing)
			.replace(isID, _c.existing._id.$objectID);
		return indexClone.replace(
			/\{indexScript\}/,
			entire.substring(entire.indexOf("{") + 1, entire.lastIndexOf("}"))
		);
	}

	return "<html><head><title>Finished</title></head><body><h2>No more conflicts ...merge in progress</h2></body></html>";
}

function writeJSON(res, json) {
	res.write(JSON.stringify(json));
	res.end();
}
function writeError(res, message) {
	return (
		writeHead(500, {
			"Content-Type": "application/json"
		}),
		writeJSON(res, {
			message
		})
	);
}
function startConflictServer() {
	// Create server
	if (!serverStarted) {
		let server = http.createServer(function(req, res) {
			if (isJs.test(req.url) || isCss.test(req.url)) {
				var filePath = "./" + path.basename(req.url);
				var stat = fs.statSync(filePath);
				console.log("filePath:" + filePath);
				res.writeHead(200, {
					"Content-Type": contentType[path.extname(req.url)],
					"Content-Length": stat.size
				});

				var readStream = fs.createReadStream(filePath);
				// We replaced all the event handlers with a simple call to readStream.pipe()
				return readStream.pipe(res);
			}

			switch (req.url) {
				case "/":
				case "/index":
					res.write(getIndex());
					res.end();
					break;
				case "/resolve":
					read(req, (er, body) => {
						if (er)
							return console.log(er), writeError(res, "failed");
						let _c = conflicts[body.id];
						if (!_c)
							return writeError(
								res,
								"Cannot find the item you are trying to merge"
							);
						if (_c.hasCode && !_c.mergedCode) {
							if (typeof body.result !== "string")
								throw new Error(
									"Expected string , got something totally different"
								);
							_c.mergedCode = true;
							_c.imported.code = body.result;
							_c.existing.code = body.result;
						} else {
							delete conflicts[body.id];
							_c.resolve(JSON.parse(body.result));
						}
						writeJSON(res, { message: "successful" });
					});
					break;
				case "/cancel":
					break;
			}
		});
		// Listen
		let port = process.env.PORT || 8818;
		server.listen(port);
		opn(`http://localhost:${port}/`);
		serverStarted = true;
	}
}

function resolveConflict(imported, existing) {
	return new Promise((resolve, reject) => {
		utils.fromObjectID(existing, u => ObjectID.prototype.isPrototypeOf(u));
		let diff = dmp.diff_main(
			JSON.stringify(imported),
			JSON.stringify(existing)
		);
		dmp.diff_cleanupSemantic(diff);

		if (diff.length == 1 && !diff[0][0]) return resolve();

		startConflictServer();
		conflicts[imported._id.$objectID] = {
			imported,
			existing,
			resolve,
			reject,
			hasCode: !!imported.code || !!existing.code
		};
	});
}

function noConflict(item) {
	return new Promise(resolve => {
		setImmediate(resolve, item);
	});
}
let tasks = [],
	ready = {},
	clients = [];

function runTasks(interval) {
	setTimeout(function() {
		let keys = Object.keys(ready),
			nextInterval = !interval ? 5000 : interval + 1000;
		if (!keys.length) return runTasks(nextInterval);
		if (ready.dbs.total !== ready.dbs.read) return runTasks(nextInterval);
		if (ready.dbs.total + 1 !== keys.length) return runTasks(nextInterval);
		for (var i = keys.length - 1; i >= 0; i--) {
			let item = ready[keys[i]];
			if (item.total !== item.read) return runTasks(nextInterval);
		}

		Promise.all(tasks.map(x => x.promise))
			.then(results => {
				let total = results.filter(x => x).length,
					done = 0,
					_close = () => {
						console.log("finished all tasks");
						clients.forEach(x => x.close());
						setImmediate(process.exit, 0);
					};
				if (total == done) return _close();
				results.forEach((result, index) => {
					if (result) {
						utils.toObjectID(result, u => new ObjectID(u));
						let collection = tasks[index].collection;
						return collection.update(
							{
								_id: result._id
							},
							{ $set: result },
							{ upsert: true },
							er => {
								if (er)
									return (
										console.log(
											"an error occurred while updating collection " +
												collection.collectionName
										),
										console.log(er),
										process.exit(1)
									);
								done++;

								console.log("successfully updated item");

								if (done == total) {
									_close();
								}
							}
						);
					}

					if (done == total) {
						_close();
					}
				});
			})
			.catch(e => {
				console.log("something bad has happened");
				console.log(e);
				process.exit(1);
			});
	}, interval);
}
(function() {
	getDirectories(path.join(__dirname, "./docs/"), (er, dbs) => {
		if (er)
			return (
				console.log("an error occurred while fetching folders"),
				console.log(er),
				process.exit(1)
			);
		ready.dbs = { total: dbs.length, read: 0 };
		dbs.forEach(dbPath => {
			let dbName = path.basename(dbPath),
				readyName = "db_" + dbName;
			ready.dbs.read++;
			getFiles(dbPath, (er, filePaths) => {
				if (er)
					return (
						console.log(
							"an error occurred while fetching database files"
						),
						console.log(er),
						process.exit(1)
					);
				ready[readyName] = { total: filePaths.length, read: 0 };
				MongoClient.connect(url + dbName, (er, client) => {
					if (er)
						return (
							console.log(
								"an error occurred while connecting to database " +
									dbName
							),
							console.log(er),
							process.exit(1)
						);
					clients.push(client);
					let db = client.db(dbName);
					filePaths.forEach(filePath => {
						let collectionName = path.basename(
							filePath,
							path.extname(filePath)
						);

						let toImport = require(filePath),
							collection = db.collection(
								toCollectionName(collectionName)
							);

						collection
							.find({
								_id: {
									$in: toImport.map(
										x => new ObjectID(x._id.$objectID)
									)
								}
							})
							.toArray((er, existing) => {
								if (er)
									return (
										console.log(
											"an error occurred while fetching collection " +
												collectionName
										),
										console.log(er),
										process.exit(1)
									);

								existing = existing.reduce((sum, x) => {
									return (sum[x._id.toString()] = x), sum;
								}, {});

								toImport.forEach(im => {
									if (existing[im._id.$objectID]) {
										return tasks.push({
											promise: resolveConflict(
												im,
												existing[im._id.$objectID]
											),
											collection
										});
									}
									tasks.push({
										promise: noConflict(im),
										collection
									});
								});

								ready[readyName].read++;
							});
					});
				});
			});
		});
		runTasks(0);
	});
})();
