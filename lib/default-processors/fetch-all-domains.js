function processor() {
  this.infrastructure.server.getDomains({}, (er, domains) => {
    if (er) return callback(er);
    return callback(null, this.libs.convertToSelectableList(domains));
  });
}

module.exports = {
  uid: "GET_ALL_DOMAINS",
  title: "List all domains",
  description: "Used to present a selectable list of domains",
  code: processor.getFunctionBody()
};
