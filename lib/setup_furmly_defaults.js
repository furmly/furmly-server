const { createContext } = require("../routes/utils");
const async = require("async");
const debug = require("debug")("furmly-server-defaults");
const processors = require("./default-processors");
const processes = require("./default-processes");
const libs = require("./default-libs");
const Preferences = require("./preferences");
const config = require("../config");
const prefs = new Preferences(require("./setup_db"));
const INIT = "BASIC_FURMLY_WEB_SERVER_SETUP";
function setup(furmlyEngine, onProcessCreated, onProcessorCreated, fn) {

  prefs.get(INIT, function(er, result) {
    if (er) return fn(er);
    if (result) return fn();
    const procs = ["CREATE_PROCESSOR", "CREATE_PROCESS", "CREATE_LIB"];
    const $password = config.get("admin.password");
    const creationProps = {
      user: {
        username: config.get("admin.username"),
        client: { clientId: config.get("clients.studio._id") }
      },
      _clientAuthorized: true
    };
    furmlyEngine.queryProcessor(
      {
        $or: procs.map(x => ({
          uid: new RegExp("^" + x + "$")
        }))
      },
      function(er, _fetchedProcs) {
        if (er) throw er;

        if (_fetchedProcs.length !== procs.length)
          throw new Error(
            "processor not found. Please ensure init was successful"
          );

        const createProcessor = _fetchedProcs.filter(x => x.uid == procs[0])[0];
        const createProcess = _fetchedProcs.filter(x => x.uid == procs[1])[0];
        const createLib = _fetchedProcs.filter(x => x.uid == procs[2])[0];
        const run = (arr, _procToRun, propName, onCreate) => {
          return arr.map(x => callback => {
            const entity = x.$model ? x.$model : x;
            debug(
              `creating default ${entity.uid || entity.name || entity.title}`
            );
            furmlyEngine.runProcessor(
              createContext(
                Object.assign({}, creationProps, {
                  body: {
                    [propName]: entity,
                    $password
                  }
                })
              ),
              _procToRun,
              (er, ent) => {
                if (er) return callback(er);
                debug(
                  `successfully created default ${entity.uid ||
                    entity.name ||
                    entity.title}`
                );
                if (!x.$doesntRequireClaim && onCreate) {
                  onCreate(Object.assign({}, entity, { _id: ent._id }));
                }
                callback();
              }
            );
          });
        };

        async.parallel(
          [
            ...run(processors, createProcessor, "entity", onProcessorCreated),
            ...run(processes, createProcess, "process", onProcessCreated),
            ...run(libs, createLib, "entity")
          ],
          er => {
            if (er) return fn(er);
            prefs.set(INIT, 1, fn);
          }
        );
      }
    );
  });
}

module.exports = setup;
