function processor() {
  this.infrastructure.server.getClients({}, (er, clients) => {
    if (er) return callback(er);
    return callback(null, this.libs.convertToSelectableList("name", clients));
  });
}

module.exports = {
  uid: "GET_ALL_CLIENTS",
  title: "List all clients",
  description: "Used to present a selectable list of clients",
  code: processor.getFunctionBody()
};
