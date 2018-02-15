module.exports = {
	dev: {
		developers: {
			superc: 1
		},
		CA: {
			CN: "ca"
		},
		clients: {
			web: {
				clientId: "n2wZASNunUShF2xQ0o4P44xImeSX6hlm",
				clientSecret: "kLqqED9oQnlnRxSjJTQZmRwH4ZKekNNW"
			},
			mobile: {
				clientId: "4FlmQMCdHXcMqKOQeyb6dZOzpRzMMeIe",
				clientSecret: "Kw9XdpUr3hyMZzJsGF5wD5bswWzmNeXs"
			}
		},
		admin: {
			username: "admin",
			password: "password"
		},
		fileUpload: {
			ttl: 600000,
			permDir: "./perm",
			tempDir: "./temp"
		},
		data: {
			web_url: "mongodb://localhost:27017/dynamo_web",
			dynamo_url: "mongodb://localhost:27017/dynamo"
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
		entRepo: {
			storeTTL: 600000
		},
		userManager: {
			tokenTTL: 86400
		},
		token_generator: {
			issuer: "seadragon:authentication_server",
			audience: "seadragon:modules",
			secret: "IxrAjDoa2FqElO7IhrSrUJELhUckePEPVpaePlS_Xaw"
		}
	},
	test: {
		developers: {
			superc: 1
		},
		CA: {
			CN: "ca"
		},
		clients: {
			web: {
				clientId: "n2wZASNunUShF2xQ0o4P44xImeSX6hlm",
				clientSecret: "kLqqED9oQnlnRxSjJTQZmRwH4ZKekNNW"
			},
			mobile: {
				clientId: "4FlmQMCdHXcMqKOQeyb6dZOzpRzMMeIe",
				clientSecret: "Kw9XdpUr3hyMZzJsGF5wD5bswWzmNeXs"
			}
		},
		admin: {
			username: "admin",
			password: "password"
		},
		fileUpload: {
			ttl: 600000,
			permDir: "./perm",
			tempDir: "./temp"
		},
		data: {
			web_url:
				"mongodb://dynamo_admin:50%40sk1dR0w@23.254.166.175:27017/dynamo_web",
			dynamo_url:
				"mongodb://dynamo_admin:50%40sk1dR0w@23.254.166.175:27017/dynamo"
		},
		processors: {
			ttl: 165000
		},
		entRepo: {
			storeTTL: 600
		},
		log: {
			server: true
		},
		postprocessors: {
			ttl: 50000
		},
		userManager: {
			tokenTTL: 86400
		},
		token_generator: {
			issuer: "seadragon:authentication_server",
			audience: "seadragon:modules",
			secret: "IxrAjDoa2FqElO7IhrSrUJELhUckePEPVpaePlS_Xaw"
		}
	},
	integrationTest: {
		clients: {
			web: {
				clientId: "GC2uOmO9TFin9UrA0uhigUc0Jhw9V9P4",
				clientSecret: "SEmL27g8c9zVvaF1vpp8IIlNIsGz1yPf"
			},
			mobile: {
				clientId: "biO8WLT8rQ8hPpgbnBLPRl4vTAdFd6b4",
				clientSecret: "hvpd8yq4GEdYyAnP6uWSXlSedjQJtRAY"
			}
		},
		admin: {
			username: "admin",
			password: "admin"
		},
		log: {
			server: false
		},
		data: {
			web_url: "mongodb://localhost:27017/dynamo_web_integration_test",
			dynamo_url: "mongodb://localhost:27017/dynamo_integration_test"
		},
		processors: {
			ttl: 5000
		},
		fileUpload: {
			ttl: 60000,
			permDir: "./perm_test",
			tempDir: "./temp_test"
		},
		entRepo: {
			storeTTL: 600000
		},
		userManager: {
			tokenTTL: 86400
		},
		postprocessors: {
			ttl: 50000
		},
		token_generator: {
			issuer: "seadragon:authentication_server",
			audience: "seadragon:modules",
			secret: "IxrAjDoa2FqElO7IhrSrUJELhUckePEPVpaePlS_Xaw"
		}
	}
};
