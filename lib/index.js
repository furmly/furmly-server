module.exports = {
	TokenGenerator: require("./token_generator"),
	ClientStore: require("./client_store"),
	UserStore: require("./user_store"),
	DomainStore: require("./domain_store"),
	ClaimsStore: require("./claims_store"),
	RoleStore: require("./role_store"),
	Infrastructure: require("./infrastructure"),
	MenuStore: require("./menu_store"),
	MongoStore: require("./store"),
	MigrationStore: require("./migration_store"),
	ScopedTokenGenerator: require("./scoped_token_generator")
};
