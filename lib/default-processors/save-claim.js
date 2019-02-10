function processor() {
  this.libs.isAuthorized.call(this, er => {
    if (er) return callback(er);
    const { server } = this.infrastructure;
    server.saveClaim(this.args.entity, callback);
  });
}

module.exports = {
  title: "Save Claim",
  description: "Processer used to create or update existing claim",
  uid: "SAVE_CLAIM",
  code: processor.getFunctionBody()
};
