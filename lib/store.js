const debug = require("debug")("store");
/**
 * Abstract Store
 * @param {String} name     Name of Model
 * @param {Object} schema   Schema of Object
 * @param {Object} mongoose Mongoose reference
 * @param {Object} conn     Mongoose connection
 */
function MongoStore(name, schema, mongoose, conn) {
	if (!mongoose || !conn || !name || !schema)
		throw new Error("mongoose/connection is required by MongoStore");
	this.model = conn.model(name, new mongoose.Schema(schema));
	this.connection = conn;
}
MongoStore.prototype.save = function(data, fn) {
	if (!data._id) new this.model(data).save(fn);
	else {
		this.model.updateOne(
			{
				_id: data._id
			},
			data,
			fn
		);
	}
};
MongoStore.prototype.get = function(query, fn) {
	this.model
		.find(query)
		.lean()
		.exec(fn);
};

/**
 * Function for transforming query result
 * @param  {Function} fn callback
 * @param  {Object}   er Error
 * @param  {Object}   x  Result to transform
 * @return {Object}      Transformed result
 */
MongoStore.prototype.transformAndSend = function(fn, er, x) {
	if (typeof fn !== "function") {
		debugger;
		debug(arguments);
	}
	if (er) return fn(er);
	if (x) {
		if (x instanceof Array) {
			x = x.map(this.transform);
		} else {
			x = this.transform(x);
		}
	}

	return fn(null, x);
};

MongoStore.prototype.createOrUpdate = function(key, data, fn) {
	this.model.update(
		key,
		data,
		{
			upsert: true
		},
		fn
	);
};
MongoStore.prototype.getRange = function(query, count, fn) {
	var self = this;
	if (!count || typeof count !== "number") {
		fn(new Error("number of items to return must be greater than zero."));
		return;
	}
	debug(query);
	var sort = !query._id || query._id.$lt ? -1 : 1;
	this.model
		.find(query)
		.sort({
			_id: sort
		})
		.limit(count)
		.lean()
		.exec(function(er, d) {
			if (er) return fn(er);

			let countquery = Object.assign({}, query);

			if (countquery._id) {
				delete countquery._id;
			}
			self.model.count(countquery, function(er, c) {
				if (er) return fn(er);

				fn(null, {
					items: d,
					total: c
				});
			});
		});
};

MongoStore.prototype.delete = function(query, fn) {
	this.model.remove(query).exec(fn);
};

MongoStore.prototype.getRangeAndTransform = function(query, count, fn) {
	var self = this;
	MongoStore.prototype.getRange.call(this, query, count, (er, result) => {
		if (er) return fn(er);

		this.transformAndSend.call(
			self,
			function(er, converted) {
				if (er) fn(er);
				result.items = converted;
				fn(null, result);
			},
			null,
			result.items
		);
	});
};

module.exports = MongoStore;
