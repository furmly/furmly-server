function processor() {
  const { server } = this.infrastructure;
  const { query = {} } = this.args;
  server.getMenuRange(
    Object.assign(
      {},
      (query.name && {
        displayLabel: new RegExp(query.name, "i")
      }) ||
        {},
      this.libs.getRangeQuery(this.args)
    ),
    parseInt(this.args.count),
    callback
  );
}

module.exports = {
  title: "Fetch menus",
  description: "Processer used to fetch menus",
  uid: "FETCH_MENUS",
  code: processor.getFunctionBody()
};
