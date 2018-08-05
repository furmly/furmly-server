let env = require("./fromEnv");
module.exports = {
  port: null,
  developers: {
    superc: 1
  },
  threadPool: {
    size: null
  },
  CA: {
    CN: "ca"
  },
  clients: {
    web: {
      clientId: "n2wZASNunUShF2xQ0o4P44xImeSX6hlm",
      clientSecret: env("WEB_CLIENT_SECRET", "kLqqED9oQnlnRxSjJTQZmRwH4ZKekNNW")
    },
    mobile: {
      clientId: "4FlmQMCdHXcMqKOQeyb6dZOzpRzMMeIe",
      clientSecret: env(
        "MOBILE_CLIENT_SECRET",
        "Kw9XdpUr3hyMZzJsGF5wD5bswWzmNeXs"
      )
    }
  },
  admin: {
    username: "admin",
    password: env("ADMIN_PASSWORD", "password")
  },
  fileUpload: {
    ttl: 60000000,
    permDir: "./perm",
    tempDir: "./temp"
  },
  data: {
    web_url: env("WEB_DB_URL", "mongodb://localhost:27017/furmly_web"),
    furmly_url: env("FURMLY_DB_URL", "mongodb://localhost:27017/furmly")
  },
  migrations: {
    folder: "../migrations"
  },
  processors: {
    ttl: 165000
  },
  log: {
    server: true
  },
  postprocessors: {
    ttl: 50000
  },
  codeGenerator: {
    defaultOptimizations: [
      "Try-catch-all-async-functions",
      "Count-all-lib-references"
    ]
  },
  entRepo: {
    storeTTL: 600000
  },
  userManager: {
    tokenTTL: 86400
  },
  token_generator: {
    issuer: "seadragon:authentication_server",
    audience: "seadragon:modules",
    secret: env(
      "DEFAULT_TOKEN_SECRET",
      "IxrAjDoa2FqElO7IhrSrUJELhUckePEPVpaePlS_Xaw"
    )
  },
  scoped_tokens: {
    download: {
      issuer: "seadragon:authentication_server_downwload",
      audience: "seadragon:modules",
      secret: env(
        "SCOPED_TOKEN_SECRET",
        "IxrZiDoa2FqElO8IhrSrUJILhUckePEPVpaePlS_Xaw"
      )
    }
  }
};
