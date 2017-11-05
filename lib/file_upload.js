//implementation using local storage.

const fs = require("fs"),
	uuid = require("uuid/v4"),
	path = require("path");
module.exports = function(config, mongoose, conn) {
	if (!config.tempDir)
		throw new Error("File temp upload directory cannot be null");

	if (!config.permDir)
		throw new Error("File perm upload directory cannot be null");

	if (!mongoose || !conn)
		throw new Error("local file upload requires a connection to mongoose");

	let MongoStore = require("./auth")._MongoStore;
	this.store = new MongoStore(
		"_uploaded_docs_",
		{
			path: { type: String, required: true },
			fields: {},
			mime: String,
			originalName: String
		},
		mongoose,
		conn
	);
	this.pending = [];
	this.upload = (user, fileInfo, fields, fn) => {
		if (!fileInfo || !fileInfo.path)
			return fn(new Error("Invalid file path"));
		this.store.save(
			{
				path: fileInfo.path,
				mime: fileInfo.mimetype,
				originalName: fileInfo.originalname
			},
			(er, saved) => {
				if (er) return fn(er);

				let cancel,
					timeout = setTimeout(() => {
						this.pending.splice(this.pending.indexOf(cancel, 1));
						fs.unlink(fileInfo.path, er => {
							if (er)
								return console.log(
									`An error occurred while deleting an existing file. ${er.message}`
								);

							this.store.delete({ _id: saved._id }, err => {
								if (err)
									console.log(
										`Error occured while deleting ${saved._id}`
									);
							});
						});
					}, config.ttl);
				cancel = { t: timeout, _id: saved._id };
				this.pending.push(cancel);
				fn(null, { id: saved._id });
			}
		);
	};

	this.moveToPermanentSite = (id, fn) => {
		getFile(id, (er, item) => {
			if (er) return fn(er);
			let newPath = config.permDir + "/" + path.basename(item.path);
			fs.rename(item.path, newPath, er => {
				if (er) return fn(er);

				let cancel = this.pending.filter(x => x._id == id);
				if (cancel.length) {
					try {
						//cancel timeout
						clearTimeout(cancel[0].t);
					} catch (e) {
						console.log(e);
					}
					this.pending.splice(this.pending.indexOf(cancel[0]), 1);
				}

				//update path.
				this.store.save({ _id: id, path: newPath }, fn);
			});
		});
	};

	//this.

	const getFile = (id, fn) => {
		this.store.get({ _id: id }, (er, item) => {
			if (er) return fn(er);

			if (!item || !item.length)
				return fn(new Error("Invalid or no path to file"));

			fn(null, item[0]);
		});
	};

	this.readFile = (id, fn) => {
		getFile(id, (er, fileDescription) => {
			if (er) return fn(er);

			//console.log(fileDescription);
			fs.readFile(fileDescription.path, (er, data) => {
				if (er) return fn(er);

				fn(null, data, fileDescription);
			});
		});
	};

	this.remove = (id, fn) => {
		getFile(id, (er, item) => {
			fs.unlink(item.path, er => {
				if (er) return fn(er);

				this.store.delete({ _id: id }, fn);
			});
		});
	};

	this.generateTempFile = (user, type, data, fn) => {
		let _path = `${this.tempDir}/${uuid()}.${type}`,
			mime = "",
			originalname = "";
		fs.writeFile(_path, data, er => {
			if (er) return fn(er);

			this.upload(user, { mime, originalname, path: _path }, null, fn);
		});
	};
};
