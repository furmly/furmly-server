function processor() {
  this.entityRepo.getProcess(
    {},
    { fields: { title: 1 }, noTransformaton: true },
    (er, processes) => {
      if (er) return callback(er);
      return callback(
        null,
        this.libs.convertToSelectableList("title", processes)
      );
    }
  );
}

module.exports = {
  uid: "GET_ALL_PROCESSES",
  title: "List all processes",
  description: "Used to present a selectable list of processes",
  code: processor.getFunctionBody()
};
