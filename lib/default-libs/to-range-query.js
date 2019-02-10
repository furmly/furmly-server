function lib() {
  exports = function(args, forceId) {
    return args._id
      ? {
          _id: {
            $lt: (!forceId && args._id) || this.createId(args._id)
          }
        }
      : {};
  };
}

module.exports = {
  description: "lib used to resolve range query",
  uid: "getRangeQuery",
  code: lib.getFunctionBody()
};
