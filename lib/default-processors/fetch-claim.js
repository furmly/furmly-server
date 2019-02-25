function processor() {
  const { server } = this.infrastructure;
  server.getClaims({ _id: this.args._id }, (er, claim) => {
    if (er) return callback(er);
    claim = claim[0];
    if (claim) {
      claim.value = { _id: claim.value };
    }
    callback(er, claim);
  });
}

module.exports = {
  title: "Fetch claim",
  description: "Processer used to fetch a claim",
  uid: "FETCH_CLAIM",
  code: processor.getFunctionBody()
};
