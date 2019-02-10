function processor() {
  const { server } = this.infrastructure;
  server.getUserById({ _id: this.args._id }, callback);
}

module.exports = {
  title: "Fetch user",
  description: "Processer used to fetch a single user",
  uid: "FETCH_USER",
  code: processor.getFunctionBody()
};
