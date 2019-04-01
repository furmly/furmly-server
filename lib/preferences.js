const fs = require("fs");
const debug = require("debug")("furmly-server:preferences");
const config = require("../config");
class Preferences {
  constructor() {
    this.homeFolder =
      process.env.APPDATA ||
      (process.platform == "darwin"
        ? process.env.HOME + "/Library/Preferences"
        : "/var/local");
    debug(`Preferences Home Folder:${this.homeFolder}`);
    this.filePath =
      process.env.FURMLY_PREFERENCES_PATH ||
      `${this.homeFolder}${(config.has("preferences_location") &&
        config.get("preferences_location")) ||
        "/furmly_preferences.json"}`;
    debug(`Preferences file path:${this.filePath}`);
    let existing =
      fs.existsSync(this.filePath) &&
      JSON.parse(fs.readFileSync(this.filePath));
    if (!existing) {
      debug("Preferences does not exist , creating a new file...");
      fs.writeFileSync(this.filePath, "{}");
      debug("Preferences created successfully.");
      existing = {};
    }
    this.config = existing;
  }
  get(key) {
    return this.config[key];
  }
  set(key, value) {
    this.config[key] = value;
    debug(`Updating preferences ${key}....`);
    fs.writeFileSync(this.filePath, JSON.stringify(this.config));
    debug(`Preference:${key} updated successfully`);
  }
}

module.exports = new Preferences();
