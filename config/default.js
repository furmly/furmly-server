const env = require("./fromEnv");
const path = require("path");
module.exports = {
  port: null,
  server: {
    caLocation: path.join(__dirname, "../ca-crt.pem"),
    certificateLocation: path.join(__dirname, "../server-crt.pem"),
    privateKeyLocation: path.join(__dirname, "../server-key.pem")
  },
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
    studio: {
      clientId: env(
        "FURMLY_STUDIO_CLIENT_ID",
        "nWIN5ZtLdjvDi2dAkT23juKIKaSYE242"
      ),
      clientSecret: env(
        "FURMLY_STUDIO_CLIENT_SECRET",
        "5EIHmKH1WRlM6eY5cdNX1bWFeOnKhLLw"
      )
    },
    web: {
      clientId: env("FURMLY_WEB_CLIENT_ID", "n2wZASNunUShF2xQ0o4P44xImeSX6hlm"),
      clientSecret: env(
        "FURMLY_WEB_CLIENT_SECRET",
        "kLqqED9oQnlnRxSjJTQZmRwH4ZKekNNW"
      )
    },
    mobile: {
      clientId: env(
        "FURMLY_MOBILE_CLIENT_ID",
        "4FlmQMCdHXcMqKOQeyb6dZOzpRzMMeIe"
      ),
      clientSecret: env(
        "FURMLY_MOBILE_CLIENT_SECRET",
        "Kw9XdpUr3hyMZzJsGF5wD5bswWzmNeXs"
      )
    }
  },
  admin: {
    username: "admin",
    password: env("FURMLY_ADMIN_PASSWORD", "password")
  },
  fileUpload: {
    ttl: 60000000,
    permDir: "./perm",
    tempDir: "./temp"
  },
  data: {
    web_url: env("FURMLY_WEB_DB_URL", "mongodb://localhost:27017/furmly_web"),
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
    defaultOptimizations: env("FURMLY_CODE_GENERATOR_OPTIMIZATIONS", [
      "Try-catch-all-async-functions",
      "Count-all-lib-references"
    ])
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
      "FURMLY_DEFAULT_TOKEN_SECRET",
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
