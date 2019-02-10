function processor() {
  this.libs.isAuthorized.call(this, er => {
    if (er) return callback(er);
    const { server } = this.infrastructure;
    server.saveMenu(this.args.entity, callback);
  });
}

module.exports = {
  title: "Save Menu",
  description: "Processer used to create or update existing menu",
  uid: "SAVE_MENU",
  code: processor.getFunctionBody()
};
