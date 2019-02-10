const ObjectID = require("mongoose").mongo.ObjectID;
const utils = require("../utilities");
const config = require("../../config");
const path = require("path");
const WEB_DB_NAME = path.basename(config.get("data.web_url"));
const DB_NAME = path.basename(config.get("data.furmly_url"));
module.exports = function({
  domainStore,
  userStore,
  claimsStore,
  roleStore,
  clientStore,
  menuStore,
  furmlyEngine
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

    return callback(
      null,
      items.map(x => {
        return (
          utils.fromObjectID(
            x,
            v =>
              ObjectID.prototype.isPrototypeOf(v) ||
              (v && typeof v == "object" && v._bsontype == "ObjectID")
          ),
          x
        );
      })
    );
  };
  return function(db, collection, filter, context, colCallback) {
    switch (db.name) {
      case DB_NAME:
        if (collection.name.toLowerCase() == "schema") {
          return furmlyEngine.allEntityConfigurations(
            true,
            false,
            {
              _id: {
                $in: collection.items.map(x => furmlyEngine.createId(x._id))
              }
            },
            convert.bind(this, colCallback)
          );
        }
        furmlyEngine.query(
          collection.name,
          filter,
          {
            noTransformaton: true
          },
          convert.bind(this, colCallback)
        );
        break;
      case WEB_DB_NAME:
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
        utils.runThirdPartyMigrationProcessor(
          db.name,
          Object.assign(context, {
            isEntityRequest: true,
            query: {
              _id: {
                $in: collection.items.map(x => ({
                  _id: x._id
                }))
              }
            },
            type: collection.name
          }),
          furmlyEngine,
          convert.bind(this, colCallback)
        );
    }
  };
};
