function processor() {
  this.libs.isAuthorized.call(this, er => {
    if (er) return callback(er);
    const { server } = this.infrastructure;
    server.updateRole(this.args.entity, callback);
  });
}

module.exports = {
  title: "Update role",
  description: "Processer used to update existing roles",
  uid: "UPDATE_ROLE",
  code: processor.getFunctionBody()
};
