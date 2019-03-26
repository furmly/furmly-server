const fs = require("fs");
const config = require("../config");
class Preferences {
  constructor() {
    this.homeFolder =
      process.env.APPDATA ||
      (process.platform == "darwin"
        ? process.env.HOME + "/Library/Preferences"
        : "/var/local");
    this.filePath =
      process.env.FURMLY_PREFERENCES_PATH ||
      `${this.homeFolder}${(config.has("preferences_location") &&
        config.get("preferences_location")) ||
        "/furmly_preferences.json"}`;
    let existing =
      fs.existsSync(this.filePath) &&
      JSON.parse(fs.readFileSync(this.filePath));
    if (!existing) {
      fs.writeFileSync(this.filePath, "{}");
      existing = {};
    }
    this.config = existing;
  }
  get(key) {
    return this.config[key];
  }
  set(key, value) {
    this.config[key] = value;
    fs.writeFileSync(this.filePath, JSON.stringify(this.config));
  }
}

module.exports = new Preferences();
