const debug = require("debug")("furmly-server:preferences");

class Preferences {
  constructor(conn) {
    if (!conn) {
      throw new Error("A valid db connection is required for preferences");
    }
    this.storage = conn.collection("_preferences_");
  }
  get(key, fn) {
    this.storage.findOne({ key }, (er, doc) => {
      if (er) return fn(er);
      return fn(null, doc && doc.value);
    });
  }
  set(key, value, fn) {
    debug(`Updating preferences ${key}....`);
    this.storage.updateOne(
      { key },
      { $set: { key, value } },
      { upsert: true },
      er => {
        if (er) return fn(er);
        debug(`Preference:${key} updated successfully`);
        return fn();
      }
    );
  }
}

module.exports = Preferences;
