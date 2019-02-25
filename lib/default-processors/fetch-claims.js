function processor() {
  const { server } = this.infrastructure;
  const { query = {} } = this.args;
  server.getClaimRange(
    Object.assign(
      {},
      (query.description && {
        description: new RegExp(query.description, "i")
      }) ||
        {},
      this.libs.getRangeQuery(this.args)
    ),
    parseInt(this.args.count),
    callback
  );
}

module.exports = {
  title: "Fetch claims",
  description: "Processer used to fetch claims",
  uid: "FETCH_CLAIMS",
  code: processor.getFunctionBody()
};
