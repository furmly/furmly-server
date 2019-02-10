function processor() {
  this.libs.isAuthorized.call(this, er => {
    if (er) return callback(er);
    const { server, fileUpload } = this.infrastructure;
    //save domain
    let files = [this.args.logo, this.args.image];
    fileUpload.isPerm(files, (er, results) => {
      if (er) return callback(er);
      let tasks = results.reduce((sum, x, index) => {
        if (!x)
          sum.push(
            fileUpload.moveToPermanentSite.bind(
              fileUpload,
              files[index],
              true // this file should be available to everyone.
            )
          );
        return sum;
      }, []);
      if (tasks.length)
        this.async.parallel(tasks, er => {
          if (er) return callback(er);
          server.saveDomain(this.args, callback);
        });
      else server.saveDomain(this.args, callback);
    });
  });
}

module.exports = {
  title: "Save Domain",
  description: "Processer used to create or update existing domain",
  uid: "SAVE_DOMAIN",
  code: processor.getFunctionBody()
};
