function processor() {
  this.libs.isAuthorized.call(this, er => {
    if (er) return callback(er);
    const { server } = this.infrastructure;
    server.createRole(this.args.entity, callback);
  });
}

module.exports = {
  title: "Create role",
  description: "Processer used to create new roles",
  uid: "CREATE_ROLE",
  code: processor.getFunctionBody()
};
