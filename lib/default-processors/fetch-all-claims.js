function processor() {
  this.infrastructure.server.getClaims({}, (er, domains) => {
    if (er) return callback(er);
    return callback(null, this.libs.convertToSelectableList("description", domains));
  });
}

module.exports = {
  uid: "GET_ALL_CLAIMS",
  title: "List all claims",
  description: "Used to present a selectable list of claims",
  code: processor.getFunctionBody()
};
