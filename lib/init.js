const infrastructure = require("./index");
const furmlyEngine = require("./furmly_engine");
const config = require("../config");
const debug = require("debug")("furmly-server:init");
const threadPool = require("./threadpool");
const async = require("async");
function _init() {
  function _getIconForDefaultProcess(proc) {
    let title = proc.title.toLowerCase();
    if (title.indexOf("processor") !== -1) return "computer";
    if (title.indexOf("schema") !== -1) return "folder";
    if (title.indexOf("lib") !== -1) return "storage";
    if (title.indexOf("create") !== -1) return "developer_board";
    if (title.indexOf("process") !== -1) return "memory";
  }
  infrastructure.init(
    config.get("admin.username"),
    config.get("admin.password"),
    function(er) {
      if (er) throw er;
      furmlyEngine.on("error", function(er) {
        debug("an error occurred!!!");
        debug(er);
      });
      furmlyEngine.on("default-process-created", function(proc) {
        async.waterfall(
          [
            infrastructure.saveClaim.bind(infrastructure, {
              type: infrastructure.constants.CLAIMS.PROCESS,
              description: proc.title,
              value: proc._id
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
                  type: "DYNAMO",
                  value: proc._id,
                  category: "MAINMENU",
                  client: infrastructure.webClient.clientId,
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
      });
      furmlyEngine.on("default-processor-created", function(proc) {
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
      });
      furmlyEngine.init(function(er) {
        if (er) throw er;
        threadPool.start();
      });
    }
  );
}
module.exports = _init;
