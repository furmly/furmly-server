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
          if (
            isObjectID(data[key]) ||
            (isObjectID(data) && Array.prototype.isPrototypeOf(parent))
          ) {
            let id = { $objectID: (data[key] || data).toString() };
            if (!index) data[key] = id;
            else parent[parentKey][index] = Object.assign(data, { [key]: id });
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
            else parent[parentKey][index] = Object.assign(data, { [key]: id });
          }
        }
      ],
      obj
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
