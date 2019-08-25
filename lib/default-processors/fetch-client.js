function processor() {
  const { server } = this.infrastructure;
  server.getClients({ _id: this.args._id }, (er, client) => {
    if (er) return callback(er);
    callback(er, client[0]);
  });
}

module.exports = {
  title: "Fetch client",
  description: "Processer used to fetch a client",
  uid: "FETCH_CLIENT",
  code: processor.getFunctionBody()
};
