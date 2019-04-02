function processor() {
  const { server } = this.infrastructure;
  this.async.parallel(
    this.args.items.map(entity =>
      server.unlockUser.bind(server, entity.username, entity.domain)
    ),
    er => {
      if (er) return callback(er);
      callback(null, { message: "Successfully unlocked user(s)" });
    }
  );
}

module.exports = {
  title: "Unlock user",
  description: "Processer used to unlock users",
  uid: "UNLOCK_USER",
  code: processor.getFunctionBody()
};
