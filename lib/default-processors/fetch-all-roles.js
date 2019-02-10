function processor() {
  this.infrastructure.server.getRoles({}, (er, roles) => {
    if (er) return callback(er);
    return callback(null, this.libs.convertToSelectableList("name", roles));
  });
}

module.exports = {
  uid: "GET_ALL_ROLES",
  title: "List all roles",
  description: "Used to present a selectable list of roles",
  code: processor.getFunctionBody()
};
