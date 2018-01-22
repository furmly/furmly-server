const fs = require("fs"),
	debug = require("debug")("file-parser"),
	path = require("path");
module.exports = function(config) {
	const getDirectories = function(src, callback) {
			fs.readdir(src, callback);
		},
		baseUrl = __dirname + "/file-parsers";
	this.parsers = {};

	getDirectories(baseUrl, (er, list) => {
		if (er) throw er;
		function load(file) {
			let loaded = require(`${baseUrl + "/" + file}`);
			if (!loaded) throw new Error(`nothing was returned, check ${file}`);
			if (
				!loaded.id ||
				(typeof loaded.id !== "string" &&
					!RegExp.prototype.isPrototypeOf(loaded.id))
			)
				throw new Error(
					"all file parsers must have a valid id (can be a regex)"
				);
			if (typeof loaded !== "function")
				throw new Error("parser must return a valid function");
			return loaded;
		}
		list.forEach(filePath => {
			this.parsers.__defineGetter__(
				path.basename(filePath, path.extname(filePath)),
				load.bind(null, filePath)
			);
		});
	});
	this.getParser = (description, data) => {
		debug("getting parser");
		debug(description);
		debug(data);
		let ext = path
				.extname(description.originalName)
				.split(".")
				.pop(),
			parser = this.parsers[ext];
		debug("ext=" + ext);
		debug(this.parsers);
		if (!parser) {
			let keys = Object.keys(this.parsers);

			for (var v = 0; v < keys.length; v++) {
				let current = this.parsers[keys[v]];
				if (
					(typeof current.id == "string" &&
						new RegExp(current.id, "i").test(ext)) ||
					current.id.test(ext)
				) {
					parser = current;
					break;
				}
			}
		}
		debug(parser);
		return parser;
	};
	this.parseOnly = (description, data, fn) => {
		let parser = this.getParser(description, data);
		if (!parser || !parser.parseOnly)
			return (
				debug("couldnt find parser"),
				fn(new Error("Cannot Parse a file of that type"))
			);

		parser.parseOnly(description, data, fn);
	};
	this.generate = (fileType, data, fn) => {
		//debug(arguments);
		//debug()
		debug(fileType);
		debug(this.parsers);
		let parser = this.getParser({ originalName: `fake.${fileType}` }, data);
		if (!parser || !parser.generate)
			return (
				debug("couldnt find parser"),
				fn(new Error("Cannot generate a file of that type"))
			);

		parser.generate(fileType, data, fn);
	};
	this.parse = (description, data, res, req) => {
		let parser = this.getParser(description, data);
		if (!parser) {
			return (
				res.status(404),
				res.send({
					error: "We dont have a file parser for that type."
				})
			);
		}

		parser(description, data, res, req);
	};
};
