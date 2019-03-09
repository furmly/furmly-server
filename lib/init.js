const infrastructure = require("./setup_infrastructure");
const furmlyEngine = require("./setup_fumly_engine");
const config = require("../config");
const setup = require("./setup_furmly_defaults");
const debug = require("debug")("furmly-server:init");
const threadPool = require("./threadpool");
const async = require("async");

function _getIconForDefaultProcess(proc) {
  let title = proc.title.toLowerCase();
  if (title.indexOf("processor") !== -1) return "desktop";
  if (title.indexOf("schema") !== -1) return "th";
  if (title.indexOf("lib") !== -1) return "book";
  if (title.indexOf("create") !== -1) return "laptop";
  if (title.indexOf("process") !== -1) return "laptop";
  if (title.indexOf("domain") !== -1) return "globe-africa";
  if (title.indexOf("user") !== -1) return "users";
  if (title.indexOf("menu") !== -1) return "bars";
  if (title.indexOf("claim") !== -1) return "lock";
  if (title.indexOf("role") !== -1) return "users-cog";
  if (title.indexOf("process") !== -1) return "laptop";
}
function onProcessCreated(proc) {
  async.waterfall(
    [
      infrastructure.saveClaim.bind(infrastructure, {
        type: infrastructure.constants.CLAIMS.PROCESS,
        description: proc.title,
        value: proc.uid || proc._id
      }),
      function(result) {
        var args = Array.prototype.slice.call(arguments);
        var callback = args[args.length - 1];
        infrastructure.addClaimToRole(
          infrastructure.defaultRole,
          null,
          result,
          function(er) {
            if (er) throw er;
            infrastructure.getClaims(
              {
                type: infrastructure.adminClaims.manage_default_process
              },
              callback
            );
          }
        );
      },
      function(result, callback) {
        infrastructure.saveMenu(
          {
            displayLabel: proc.title,
            group: "Configuration",
            icon: _getIconForDefaultProcess(proc),
            claims: result.map(function(x) {
              return x._id;
            }),
            type: "FURMLY",
            value: proc._id,
            category: "MAINMENU",
            client: infrastructure.studioClient.clientId,
            activated: true
          },
          callback
        );
      }
    ],
    function(er) {
      if (er) throw er;
    }
  );
}
function onProcessorCreated(proc) {
  infrastructure.saveClaim(
    {
      type: infrastructure.constants.CLAIMS.PROCESSOR,
      description: proc.title,
      value: proc._id
    },
    function(er, claim) {
      infrastructure.addClaimToRole(
        infrastructure.defaultRole,
        null,
        claim,
        function(er) {
          if (er)
            debug(
              "an error occurred while adding claim to role:" +
                infrastructure.defaultRole
            );
        }
      );
    }
  );
}

function _init() {
  infrastructure.init(
    config.get("admin.username"),
    config.get("admin.password"),
    function(er) {
      if (er) throw er;
      furmlyEngine.on("error", function(er) {
        debug("an error occurred!!!");
        debug(er);
      });
      furmlyEngine.on("default-process-created", onProcessCreated);
      furmlyEngine.on("default-processor-created", onProcessorCreated);
      furmlyEngine.init(function(er) {
        if (er) throw er;
        debug("furmly engine initialized correctly");
        threadPool.start();
        //create default processors.
        setup(furmlyEngine, onProcessCreated, onProcessorCreated, er => {
          if (er)
            setTimeout(() => {
              throw er;
            }, 0);
        });
      });
    }
  );
}
module.exports = _init;
