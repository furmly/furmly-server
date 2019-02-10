function processor() {
  const { server } = this.infrastructure;
  server.getRole(this.args._id, callback);
}

module.exports = {
  title: "Fetch role",
  description: "Processer used to fetch a single role",
  uid: "FETCH_ROLE",
  code: processor.getFunctionBody()
};
