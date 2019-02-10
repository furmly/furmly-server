function processor() {
  const { server } = this.infrastructure;
  const { query = {} } = this.args;
  server.getRoleRange(
    Object.assign(
      {},
      (query.domain && { domain: query.domain }) || {},
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
  title: "Fetch roles",
  description: "Processer used to fetch roles",
  uid: "FETCH_ROLES",
  code: processor.getFunctionBody()
};
