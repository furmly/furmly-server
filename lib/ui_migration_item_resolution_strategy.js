/**
 * Assumes UI has already resolved the objects before sending.
 * @return {Function} Function used to find items.
 */
module.exports = function() {
	return function(db, collection, filter, colCallback) {
		setImmediate(colCallback, null, collection.items);
	};
};
