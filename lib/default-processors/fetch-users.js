function processor() {
  const { server } = this.infrastructure;
  const { query = {} } = this.args;
  server.getUserRange(
    Object.assign(
      {},
      (query.domain && { domain: query.domain }) || {},
      (query.username && {
        username: new RegExp(query.username, "i")
      }) ||
        {},
      this.libs.getRangeQuery(this.args)
    ),
    parseInt(this.args.count),
    callback
  );
}

module.exports = {
  title: "Fetch users",
  description: "Processer used to fetch users",
  uid: "FETCH_USERS",
  code: processor.getFunctionBody()
};
