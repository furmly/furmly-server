function processor() {
  const { server } = this.infrastructure;
  server.getMenu(this.args._id, (er, menu) => {
    if (er) return callback(er);
    menu.value = { _id: menu.value };
    callback(er, menu);
  });
}

module.exports = {
  title: "Fetch menu",
  description: "Processer used to fetch a single menu",
  uid: "FETCH_MENU",
  code: processor.getFunctionBody()
};
