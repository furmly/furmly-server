let ObjectID = require("mongodb").ObjectID,
	utils = require("./utilities");

module.exports = function({
	userStore,
	claimsStore,
	roleStore,
	clientStore,
	menuStore,
	dynamoEngine
}) {
	/**
 * Used to map stores to collection names
 * @param  {String} name Collection name
 * @return {Object}      Store containing methods for retrieving objects of type {name}
 */
	const getStoreFor = function(name) {
		switch (name) {
			case "User":
				return userStore;
			case "Claim":
				return claimsStore;
			case "Domain":
				return domainStore;
			case "Menu":
				return menuStore;
			case "Role":
				return roleStore;
			case "Client":
				return clientStore;
			default:
				throw new Error(`cannot locate the right store for ${name}`);
		}
	};
	const convert = function(callback, er, items) {
		if (er) return callback(er);
		debugger;
		return callback(
			null,
			items.map(x => {
				return (
					utils.fromObjectID(
						x,
						v =>
							ObjectID.prototype.isPrototypeOf(v) ||
							(v &&
								typeof v == "object" &&
								v._bsontype == "ObjectID")
					),
					x
				);
			})
		);
	};
	return function(db, collection, filter, colCallback) {
		switch (db.name) {
			case "dynamo":
				if (collection.name.toLowerCase() == "schema") {
					return dynamoEngine.allEntityConfigurations(
						true,
						false,
						{
							_id: {
								$in: collection.items.map(x =>
									dynamoEngine.createId(x._id)
								)
							}
						},
						convert.bind(this, colCallback)
					);
				}
				dynamoEngine.query(
					collection.name,
					filter,
					{
						noTransformaton: true
					},
					convert.bind(this, colCallback)
				);
				break;
			case "dynamo_web":
				try {
					getStoreFor(collection.name).get(
						filter,
						convert.bind(this, colCallback)
					);
				} catch (e) {
					setImmediate(colCallback, e);
				}

				break;
			default:
				setImmediate(colCallback, new Error("Unknown database type"));
		}
	};
};
