function processor() {
  this.libs.isAuthorized.call(this, er => {
    if (er) return callback(er);
    const { server } = this.infrastructure;
    server.register(this.args.entity, callback);
  });
}

module.exports = {
  title: "Register user",
  description: "Processer used to regiter new users",
  uid: "REGISTER_USER",
  code: processor.getFunctionBody()
};
