function processor() {
  this.libs.isAuthorized.call(this, er => {
    if (er) return callback(er);
    const { server } = this.infrastructure;
    server.saveClient(this.args.entity, callback);
  });
}

module.exports = {
  title: "Save Client",
  description: "Processer used to create or update existing client",
  uid: "SAVE_CLIENT",
  code: processor.getFunctionBody()
};
