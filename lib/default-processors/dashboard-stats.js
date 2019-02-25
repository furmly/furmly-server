function processor() {
  const toCount = Object.values(this.systemEntities);
  const { server } = this.infrastructure;
  const serverEntities = ["Menu", "Claim", "User", "Role"];
  this.async.parallel(
    toCount
      .map(x => {
        return this.entityRepo.count.bind(this.entityRepo, x, {});
      })
      .concat(serverEntities.map(x => server[`count${x}`].bind(server, {}))),
    (er, counts) => {
      //ive counted all the system entities.
      if (er) return callback(er);

      callback(null, {
        totals: Object.keys(this.systemEntities)
          .reduce((acc, key, index) => {
            acc.push({ total: counts[index], key });
            return acc;
          }, [])
          .concat(
            serverEntities.map((key, index) => {
              return {
                total: counts[toCount.length + index],
                key: key.toLowerCase()
              };
            })
          )
      });
    }
  );
}

module.exports = {
  title: "Dashboard stats",
  description: "Processer used to fetch dashboard stats",
  uid: "DASHBOARD_STATS",
  code: processor.getFunctionBody()
};
