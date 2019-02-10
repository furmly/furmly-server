function processor() {
  const { server } = this.infrastructure;
  const { query = {} } = this.args;
  server.getDomainRange(
    Object.assign(
      {},
      (query.name && {
        name: new RegExp(query.name, "i")
      }) ||
        {},
      this.libs.getRangeQuery(this.args)
    ),
    parseInt(this.args.count),
    callback
  );
}

module.exports = {
  title: "Fetch domains",
  description: "Processer used to fetch domains",
  uid: "FETCH_DOMAINS",
  code: processor.getFunctionBody()
};
