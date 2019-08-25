function processor() {
    const { server } = this.infrastructure;
    const { query = {} } = this.args;
    server.getClientRange(
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
    title: "Fetch clients",
    description: "Processer used to fetch clients",
    uid: "FETCH_CLIENTS",
    code: processor.getFunctionBody()
  };
  