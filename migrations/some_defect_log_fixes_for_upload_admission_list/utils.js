const MIGRATION_LIBS = "$migration_libs_";
var createAssigner = function(keysFunc, undefinedOnly) {
  return function(obj) {
    var length = arguments.length;
    if (length < 2 || obj === null) return obj;
    for (var index = 1; index < length; index++) {
      var source = arguments[index],
        keys = keysFunc(source),
        l = keys.length;
      for (var i = 0; i < l; i++) {
        var key = keys[i];
        if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
      }
    }
    return obj;
  };
};
function runThroughObj(
  conditions,
  data,
  result = {},
  parent = null,
  parentKey = null,
  index = null
) {
  if (data && typeof data === "object") {
    Object.keys(data).forEach(key => {
      for (var v = 0; v < conditions.length; v++) {
        if (conditions[v](key, data, result, parent, parentKey, index))
          return result;
      }
      if (Array.prototype.isPrototypeOf(data[key]))
        return data[key].forEach(function(element, index) {
          runThroughObj(conditions, element, result, data, key, "" + index);
        });
      if (data[key] && typeof data[key] == "object")
        return runThroughObj(conditions, data[key], result, data, key);
    });
  }

  return result;
}

module.exports = {
  shims: function() {
    String.prototype.toCamelCase = function() {
      return this.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
        return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
      }).replace(/\s+/g, "");
    };
  },
  assign: createAssigner(Object.keys),
  contains: function(predicate, item, list) {
    for (var i = list.length - 1; i >= 0; i--) {
      if (predicate(item, list[i])) return true;
    }
    return false;
  },
  fromObjectID: function(obj, isObjectID) {
    runThroughObj(
      [
        (key, data, result, parent, parentKey, index) => {
          let _id, onObject;
          if (key == "$objectID") return;
          if (
            (isObjectID(data[key]) &&
              (_id = data[key].toString()) &&
              (onObject = true)) ||
            (isObjectID(data) &&
              parent &&
              Array.prototype.isPrototypeOf(parent[parentKey]) &&
              (_id = data.toString()))
          ) {
            let id = { $objectID: _id };
            if (!index || onObject) data[key] = id;
            else parent[parentKey][index] = id;
          }
        }
      ],
      obj
    );
  },
  toObjectID: function(obj, objectID) {
    runThroughObj(
      [
        (key, data, result, parent, parentKey, index) => {
          if (key == "$objectID") {
            let id = objectID(data[key]);
            if (!index) parent[parentKey] = id;
            else parent[parentKey][index] = id;
          }
        }
      ],
      obj
    );
  },
  runThirdPartyMigrationProcessor: function(db_name, opts, dynamoEngine, fn) {
    if (!db_name || !dynamoEngine || !opts || !fn)
      throw new Error(
        "db_name ,dynamoEngine,opts and Callback function must be present"
      );
    dynamoEngine.queryProcessor(
      { uid: `${MIGRATION_LIBS}_${db_name}` },
      { one: true },
      (er, processor) => {
        if (er) return fn(er);
        if (!processor)
          return fn(
            new Error(
              `There's no default processor configuration to handle that database, please save a processor with the uid convention ${MIGRATION_LIBS}_db_name`
            )
          );
        dynamoEngine.runProcessor(opts, processor, fn);
      }
    );
  },
  difference: function(
    a1,
    a2,
    compare = function(item, otherList) {
      return otherList.indexOf(item) === -1;
    }
  ) {
    var result = [];
    for (var i = 0; i < a1.length; i++) {
      if (compare(a1[i], a2)) {
        result.push(a1[i]);
      }
    }
    return result;
  }
};
