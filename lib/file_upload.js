//implementation using local storage.

const fs = require("fs"),
	uuid = require("uuid/v4"),
	debug = require("debug")("file-upload"),
	path = require("path"),
	mimes = (module.exports = function(config, mongoose, conn) {
		if (!config.tempDir)
			throw new Error("File temp upload directory cannot be null");

		if (!config.permDir)
			throw new Error("File perm upload directory cannot be null");

		if (!mongoose || !conn)
			throw new Error(
				"local file upload requires a connection to mongoose"
			);

		let MongoStore = require("./auth")._MongoStore;
		this.MIMES = {
			xlsx:
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		};
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
			debug("user---x");
			debug(user);
			debug("fileInfo---x");
			debug(fileInfo);
			debug("fields----x");
			debug(fields);
			debug("fn-----x");
			debug(fn);
			this.store.save(
				{
					path: fileInfo.path,
					mime: fileInfo.mimetype,
					originalName: fileInfo.originalname
				},
				(er, saved) => {
					if (er) return fn(er);
					debug("saved file in _uploaded_docs_ ...");
					let cancel,
						timeout = setTimeout(() => {
							this.pending.splice(
								this.pending.indexOf(cancel, 1)
							);
							fs.unlink(fileInfo.path, er => {
								if (er)
									return debug(
										`An error occurred while deleting an existing file. ${er.message}`
									);

								this.store.delete({ _id: saved._id }, err => {
									if (err)
										debug(
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
							debug(e);
						}
						this.pending.splice(this.pending.indexOf(cancel[0]), 1);
					}

					//update path.
					this.store.save({ _id: id, path: newPath }, fn);
				});
			});
		};

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

		this.generateTempFile = (user, type, data, filename, fn) => {
			let _path = `${config.tempDir}/${uuid()}.${type}`,
				mimetype = this.MIMES[type],
				originalname = `${filename}.${type}`;
			debug(_path);
			fs.writeFile(_path, data, er => {
				if (er) return fn(er);

				debug("written successfully...");
				debug(data);
				debug(user);
				this.upload(
					user,
					{ mimetype, originalname, path: _path },
					null,
					fn
				);
			});
		};
	});
