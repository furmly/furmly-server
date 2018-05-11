//implementation using local storage.

const fs = require("fs"),
	uuid = require("uuid/v4"),
	debug = require("debug")("file-upload"),
	path = require("path");
/**
	 * File Upload
	 * @classS
	 * @param  {configuration} config   Configuration object
	 * @param  {Object} mongoose Mongoose instance
	 * @param  {Object} conn     Mongoose connection
	 * 
	 */
function FileUpload(config, mongoose, conn) {
	if (!config.tempDir)
		throw new Error("File temp upload directory cannot be null");

	if (!config.permDir)
		throw new Error("File perm upload directory cannot be null");

	if (!mongoose || !conn)
		throw new Error("local file upload requires a connection to mongoose");

	let MongoStore = require("./store");
	this.MIMES = {
		xlsx:
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	};
	this.config = config;
	this.store = new MongoStore(
		"_uploaded_docs_",
		{
			path: { type: String, required: true },
			fields: {},
			mime: String,
			originalName: String,
			isPerm: Boolean,
			user: mongoose.Schema.Types.ObjectId
		},
		mongoose,
		conn
	);

	this.pending = [];
}

FileUpload.prototype.isPerm = function(arr, fn) {
	let result = [];
	return this.store.get({ _id: { $in: arr } }, (er, files) => {
		if (er) return fn(er);
		files.forEach(x => {
			result.splice(arr.indexOf(x._id.toString()), 1, !!x.isPerm);
		});
		return fn(null, result);
	});
};
/**
 * Upload a file to temporary storage controlled by configured ttl.
 * @param  {Object}   user     Logged in user
 * @param  {Object}   fileInfo Must include path , mimetype and originalname properties
 * @param  {Object}   fields   Extra fields to store
 * @param  {Function} fn       Callback
 *
 */
FileUpload.prototype.upload = function(user, fileInfo, fields, fn) {
	if (!fileInfo || !fileInfo.path) return fn(new Error("Invalid file path"));
	debug("user---x");
	debug(user);
	debug("fileInfo---x");
	debug(fileInfo);
	debug("fields----x");
	debug(fields);
	debug("fn-----x");
	debug(fn);
	let data = {
		path: fileInfo.path,
		mime: fileInfo.mimetype,
		originalName: fileInfo.originalname
	};
	if (user) {
		data.user = user._id;
	}
	this.store.save(data, (er, saved) => {
		if (er) return fn(er);
		debug("saved file in _uploaded_docs_ ...");
		let cancel,
			timeout = setTimeout(() => {
				this.pending.splice(this.pending.indexOf(cancel, 1));
				fs.unlink(fileInfo.path, er => {
					if (er)
						return debug(
							`An error occurred while deleting an existing file. ${er.message}`
						);

					this.store.delete({ _id: saved._id }, err => {
						if (err)
							debug(`Error occured while deleting ${saved._id}`);
					});
				});
			}, this.config.ttl);
		cancel = { t: timeout, _id: saved._id };
		this.pending.push(cancel);
		fn(null, { id: saved._id });
	});
};

/**
 * Move file to permanent site
 * @param  {String}   id file id
 * @param  {Function} fn Callback
 * 
 */
FileUpload.prototype.moveToPermanentSite = function(id, fn) {
	this._getFile(id, (er, item) => {
		if (er) return fn(er);
		let cancelPending = () => {
			debugger;
			let cancel = this.pending.filter(
				x => x._id.toString() == id.toString()
			);
			if (cancel.length) {
				try {
					//cancel timeout
					clearTimeout(cancel[0].t);
				} catch (e) {
					debug(e);
				}
				this.pending.splice(this.pending.indexOf(cancel[0]), 1);
			}
		};
		let newPath = this.config.permDir + "/" + path.basename(item.path);
		if (newPath == item.path) {
			return cancelPending(), setImmediate(fn);
		}

		fs.rename(item.path, newPath, er => {
			if (er) return fn(er);

			cancelPending();
			//update path.
			this.store.save({ _id: id, path: newPath, isPerm: true }, fn);
		});
	});
};
/**
 * Inner function that returns file info from the stor
 * @param  {string}   id file Id
 * @param  {Function} fn Callback
 * 
 */
FileUpload.prototype._getFile = function(id, fn) {
	this.store.get({ _id: id }, (er, item) => {
		if (er) return fn(er);

		if (!item || !item.length)
			return fn(new Error(`Invalid or no path to file ${id}`));

		fn(null, item[0]);
	});
};

/**
 * Read a file (content)
 * @param  {String}   id file id
 * @param  {Function} fn Callback
 * 
 */
FileUpload.prototype.readFile = function(id, user, fn) {
	this._getFile(id, (er, fileDescription) => {
		if (er) return fn(er);
		//uploaded with a user context, and attempted read without one.
		if (fileDescription.user && !user)
			return fn(new Error("You are not authorized to read that file"));
		fs.readFile(fileDescription.path, (er, data) => {
			if (er) return fn(er);

			fn(null, data, fileDescription);
		});
	});
};

/**
 * Remove/Delete file
 * @param  {String}   id file id
 * @param  {Function} fn Callback
 * 
 */
FileUpload.prototype.remove = function(id, fn) {
	this._getFile(id, (er, item) => {
		fs.unlink(item.path, er => {
			if (er) return fn(er);

			this.store.delete({ _id: id }, fn);
		});
	});
};

/**
 * Generates a Temporary file that is stored for only as long as the servers configured ttl.
 * @param  {Object}   user     Logged in user
 * @param  {String}   type     Type of file to generate eg xlsx,xlx,pdf ...etc
 * @param  {Object}   data     Data that makes up the file
 * @param  {String}   filename File Name
 * @param  {Function} fn       Callback
 * 
 */
FileUpload.prototype.generateTempFile = function(
	user,
	type,
	data,
	filename,
	fn
) {
	let _path = `${this.config.tempDir}/${uuid()}.${type}`,
		mimetype = this.MIMES[type],
		originalname = `${filename}.${type}`;
	debug(_path);
	fs.writeFile(_path, data, er => {
		if (er) return fn(er);

		debug("written successfully...");
		debug(data);
		debug(user);
		this.upload(user, { mimetype, originalname, path: _path }, null, fn);
	});
};
module.exports = FileUpload;
