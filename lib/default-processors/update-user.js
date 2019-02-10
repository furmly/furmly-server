function processor() {
  this.libs.isAuthorized.call(this, er => {
    if (er) return callback(er);
    const { server } = this.infrastructure;
    server.updateUser(this.args.entity, callback);
  });
}

module.exports = {
  title: "Update user",
  description: "Processer used to update existing users",
  uid: "UPDATE_USER",
  code: processor.getFunctionBody()
};
