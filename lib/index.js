const conn = require("./setup_db");
const mongoose = require("mongoose");
const config = require("../config");
const Infrastructure = require("./infrastructure");
const debug = require("debug")("furmly-server:infrastructure-setup");

const infrastructureParams = {
  domainStore: new (require("./stores/domain_store"))(mongoose, conn),
  userStore: new (require("./stores/user_store"))(mongoose, conn),
  clientStore: new (require("./stores/client_store"))(mongoose, conn),
  roleStore: new (require("./stores/role_store"))(mongoose, conn),
  claimsStore: new (require("./stores/claims_store"))(mongoose, conn),
  tokenGen: new (require("./services/token_generator"))(
    config.get("token_generator")
  ),
  scopedTokenGen: new (require("./services/scoped_token_generator"))(
    require("./services/token_generator"),
    config.get("scoped_tokens")
  ),
  menuStore: new (require("./stores/menu_store"))(mongoose, conn),
  defaultClaims: {
    manage_default_process: "manage-default-process",
    create_process: {
      type: Infrastructure.constants.CLAIMS.PROCESS,
      description: "Edit a process",
      value: "CREATE_PROCESS"
    }
  },
  webClient: config.clients.web,
  mobileClient: config.clients.mobile,
  config:
    (config.get("userManager") &&
      debug("use infrastructure property , userManager is [deprecated]"),
    config.get("userManager")) || config.get("infrastructure")
};

infrastructureParams.migrationStore = new (require("./stores/migration_store"))(
  mongoose,
  conn,
  config.get("migrations"),
  require("./migration_strategies/furmly_migration_item_resolution_strategy")({
    domainStore: infrastructureParams.domainStore,
    userStore: infrastructureParams.userStore,
    roleStore: infrastructureParams.roleStore,
    claimsStore: infrastructureParams.claimsStore,
    menuStore: infrastructureParams.menuStore,
    clientStore: infrastructureParams.clientStore
  })
);
module.exports = new Infrastructure(infrastructureParams);
