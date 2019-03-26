const env = require("./fromEnv");
const path = require("path");
module.exports = {
  port: null,
  server: {
    withCA: env("FURMLY_SERVER_WITH_CA", "true", "bool"),
    caLocation: env("FURMLY_CA_PATH", path.join(__dirname, "../ca-crt.pem")),
    certificateLocation: env(
      "FURMLY_CERT_PATH",
      path.join(__dirname, "../server-crt.pem")
    ),
    privateKeyLocation: env(
      "FURMLY_PRIV_KEY_PATH",
      path.join(__dirname, "../server-key.pem")
    )
  },
  developers: env("FURMLY_ALLOWED", "superc", "map"),
  threadPool: {
    size: null
  },
  CA: {
    CN: env("FURMLY_CA_CN", "ca", "map")
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
    username: env("FURMLY_ADMIN_USERNAME", "dev"),
    password: env("FURMLY_ADMIN_PASSWORD", "password")
  },
  fileUpload: {
    ttl: env("FURMLY_FILEUPLOAD_TTL", 60000000),
    permDir: "./perm",
    tempDir: "./temp"
  },
  data: {
    web_url: env("FURMLY_WEB_DB_URL", "mongodb://localhost:27017/furmly_web"),
    furmly_url: env("FURMLY_DB_URL", "mongodb://localhost:27017/furmly")
  },
  migrations: {
    folder: env("FURMLY_MIGRATIONS_FOLDER", "../migrations")
  },
  processors: {
    ttl: env("FURMLY_PROCESSORS_TTL", 165000)
  },
  log: {
    server: true
  },
  postprocessors: {
    ttl: env("FURMLY_POST_PROCESSORS_TTL", 5000)
  },
  codeGenerator: {
    defaultOptimizations: env("FURMLY_CODE_GENERATOR_OPTIMIZATIONS", [
      "Try-catch-all-async-functions",
      "Count-all-lib-references"
    ])
  },
  entRepo: {
    storeTTL: env("FURMLY_STORE_TTL", 600000)
  },
  infrastructure: {
    tokenTTL: 86400,
    compress: env("FURMLY_COMPRESS_USER_IN_JWT", true, "bool")
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
      issuer: "seadragon:authentication_server_download",
      audience: "seadragon:modules",
      secret: env(
        "FURML_SCOPED_TOKEN_SECRET",
        "IxrZiDoa2FqElO8IhrSrUJILhUckePEPVpaePlS_Xaw"
      )
    }
  }
};
