var express = require("express"),
    config = require("./config")[
        process.env.profile || process.env.NODE_ENV || "dev"
    ],
    fs = require("fs"),
    dynamo = require("dynamo")(config),
    debug = require("debug")("dynamo-web-server"),
    mongoose = require("mongoose"),
    uuid = require("uuid"),
    url = require("url"),
    crypto = require("crypto"),
    utils = require("./lib/utilities"),
    passport = require("passport"),
    oauth2orize = require("oauth2orize"),
    passport_auth = require("./lib/passport_auth"),
    lib = require("./lib/index"),
    passport = require("passport"),
    request = require("request"),
    multer = require("multer"),
    templating = require("./lib/templating")(config),
    upload = multer({
        dest: config.fileUpload ? config.fileUpload.tempDir : "/temp"
    }),
    fileParser = new (require("./lib/parser"))(config),
    async = require("async"),
    app = express(),
    https = require("https"),
    bodyParser = require("body-parser"),
    processes = express.Router(),
    morgan = require("morgan"),
    threadPool = new (require("./lib/worker"))(
        (config.threadPool && config.threadPool.size) ||
            require("os").cpus().length - 1,
        [`${__dirname}/node_modules/bson/lib/bson/objectid.js`]
    ),
    admin = express.Router(),
    uploadRouter = express.Router(),
    downloadRouter = express.Router(),
    processors = express.Router(),
    entities = express.Router(),
    asyncValidators = express.Router(),
    dynamoEngine = new dynamo.Engine({
        entitiesRepository: new dynamo.EntityRepo({
            folder: "./entities/",
            storeTTL: config.entRepo.storeTTL,
            config
        })
    });
//debug(config.clients);
mongoose.Promise = global.Promise;
let conn = mongoose.createConnection(config.data.web_url),
    infrastructureParams = {
        domainStore: new lib.DomainStore(mongoose, conn),
        userStore: new lib.UserStore(mongoose, conn),
        clientStore: new lib.ClientStore(mongoose, conn),
        roleStore: new lib.RoleStore(mongoose, conn),
        claimsStore: new lib.ClaimsStore(mongoose, conn),
        tokenGen: new lib.TokenGenerator(config.token_generator),
        scopedTokenGen: new lib.ScopedTokenGenerator(
            lib.TokenGenerator,
            config.scoped_tokens
        ),
        menuStore: new lib.MenuStore(mongoose, conn),
        defaultClaims: {
            manage_default_process: "manage-default-process",
            create_process: {
                type: lib.Infrastructure.constants.CLAIMS.PROCESS,
                description: "Edit a process",
                value: "CREATE_PROCESS"
            }
        },
        webClient: config.clients.web,
        mobileClient: config.clients.mobile,
        config:
            (config.userManager &&
                debug(
                    "use infrastructure property , userManager is [deprecated]"
                ),
            config.userManager) || config.infrastructure
    },
    fileUpload = new (require("./lib/file_upload"))(
        config.fileUpload,
        mongoose,
        conn
    );
infrastructureParams.migrationStore = new lib.MigrationStore(
    mongoose,
    conn,
    config.migrations,
    require("./lib/dynamo_migration_item_resolution_strategy")({
        domainStore: infrastructureParams.domainStore,
        userStore: infrastructureParams.userStore,
        roleStore: infrastructureParams.roleStore,
        claimsStore: infrastructureParams.claimsStore,
        menuStore: infrastructureParams.menuStore,
        clientStore: infrastructureParams.clientStore,
        dynamoEngine
    })
);
const infrastructure = new lib.Infrastructure(infrastructureParams);
dynamoEngine.setInfrastructure({
    userManager: infrastructure,
    fileParser,
    fileUpload,
    threadPool,
    templating,
    request,
    url,
    crypto
});

app.use(
    morgan("dev", {
        skip: function() {
            return !config.log.server;
        }
    })
);
app.use(bodyParser.json({ limit: "5mb" }));

function unauthorized(req, res) {
    let msg = "You are not authorized";
    res.status(401);
    res.statusMessage = msg;
    res.send({
        error: "Unauthorized",
        error_description: msg
    });
}

function verify(req, res, next) {
    passport.authenticate(
        "accessToken",
        {
            session: false
        },
        (er, user) => {
            if (er) {
                sendResponse.call(res, er);
                return;
            }
            debug(user || "user is null");
            if (user) req.user = user;
            if (VerificationOverride.prototype.isPrototypeOf(this))
                return (
                    debug("verification has been overriden"),
                    this.verify(req, res, next)
                );
            if (user) return next();
            return unauthorized(req, res);
        }
    )(req, res, next);
}
function VerificationOverride(fn) {
    this.fn = fn;
}
VerificationOverride.prototype.verify = function(req, res, next) {
    return this.fn(req, res, next);
};
function ensureProcessorCanRunStandalone(req, res, next) {
    if (!req.processor || !req.processor.standalone) {
        return (
            debug("processor cannot run standalone"),
            debug(req.processor),
            sendResponse.call(
                res,
                new Error("That action requires the proper context to run"),
                400
            )
        );
    }
    return next();
}
function ensureProcessContext(req, res, next) {
    debug(
        `requiresIdentity:${req.process
            .requiresIdentity} userContext:${req.user} ClaimNotRequired:${req._claimNotRequired}`
    );
    if (
        !req.process.requiresIdentity &&
        req.headers.authorization &&
        req._claimNotRequired
    ) {
        return (
            debug(
                "Process does not require a context and does not have a claim but one is provided"
            ),
            debug(req.process),
            sendResponse.call(
                res,
                new Error("You may need to logout to continue"),
                400
            )
        );
    }
    next();
}
function verifyIfRequired(getItem, req, res, next) {
    debug("checking if identity is required...");
    var item = getItem(req);
    if (!item)
        return (
            debug("cannot find the item"),
            sendResponse.call(
                res,
                new Error("we couldnt find what you were looking for"),
                404
            )
        );
    if (item.requiresIdentity || typeof item.requiresIdentity == "undefined")
        return debug("identity is required"), verify(req, res, next);

    debug("identity is not required");
    next();
}

function getDomain(domainId, req, fn) {
    infrastructure.getDomains(
        getObjectIdOrQuery(domainId, { uid: domainId }),
        (er, domains) => {
            if (er) return fn(er);
            if (domains.length) {
                req._domain = domains[0];
                req._domain.config =
                    req._domain.config &&
                    req._domain.config.reduce((sum, x) => {
                        return (sum[x.name] = x.value), sum;
                    }, {});
            }
            fn();
        }
    );
}

function checkClaim(type, value, failed, req, res, next) {
    if (Array.prototype.slice(arguments).length == 5) {
        next = res;
        res = req;
        req = failed;
        failed = null;
    }
    var _value = value;
    if (req.user) {
        value = value(req);
        var joinedClaims = req.user.roles.reduce(
            function(m, x) {
                return m.claims.concat(x.claims);
            },
            {
                claims: []
            }
        );
        var hasClaim = joinedClaims.filter(function(claim) {
            return claim.type == type && claim.value == value;
        });

        if (hasClaim.length) {
            next();
            return;
        }

        debug(`user does not have claim of type:${type} and value:${value}`);
        debug(`user has ${JSON.stringify(joinedClaims, null, " ")}`);
    }

    if (failed) return failed(type, _value, req, res, next);
    unauthorized(req, res);
}

function getObjectIdOrQuery(id, or, propName) {
    var query = { $or: [or] };

    if (dynamoEngine.isValidID(id)) {
        query.$or.push({ [propName || "_id"]: id });
    }
    return query;
}
function removeNonASCIICharacters(str) {
    return str.replace(
        /[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g,
        ""
    );
}
function sendResponse(er, result) {
    let errorMessage =
        er && removeNonASCIICharacters(er.message || "Unknown Error occurred");
    if (er)
        return (
            debug(er),
            this.status((typeof result == "number" && result) || 500),
            this.append("ErrorMessage", errorMessage),
            (this.statusMessage = errorMessage),
            this.send({
                error:
                    "An unknown error occurred. We' have to find out why. In the meantime try a refresh.",
                error_description: er.message
            })
        );

    this.send(result);
}

function getRangeQuery(req, forceId) {
    var query = req.query.lastId
        ? {
              _id: {
                  $lt:
                      (!forceId && req.query.lastId) ||
                      dynamoEngine.createId(req.query.lastId)
              }
          }
        : {};
    return query;
}
function getMongoQuery(item) {
    return item.split(",").reduce(function(sum, x) {
        var prop_value = x.split("=");
        sum[prop_value[0]] = new RegExp(prop_value[1], "i");
        return sum;
    }, {});
}
function toRegex(string) {
    return new RegExp(string, "i");
}

function checkId(req) {
    return req.params.id;
}

function emptyVal() {
    return null;
}

function _clientAuthentication(req, res, next) {
    if (req.client.authorized) {
        debug("client certificate is present");
        var cert = req.socket.getPeerCertificate();
        if (cert.subject) {
            debug(
                `certificate subject: ${JSON.stringify(
                    cert.subject,
                    null,
                    " "
                )}`
            );
            req._clientAuthorized =
                !!config.developers[cert.subject.CN] &&
                cert.issuer.CN == config.CA.CN;
            debug(
                `client is ${req._clientAuthorized
                    ? "authorized"
                    : "unauthorized"}`
            );
        }
    }
    next();
}

function createContext(req) {
    let context =
            (req.body && Object.keys(req.body).length && req.body) ||
            req.query ||
            {},
        authorized = req._clientAuthorized,
        domain = Object.assign({}, req._domain),
        uiOnDemand =
            (req.body && req.body.$uiOnDemand) || req.query.$uiOnDemand,
        user = Object.assign({}, req.user);
    (requestContext = Object.assign({}, req.headers)),
        Object.defineProperties(context, {
            $authorized: {
                enumerable: false,
                get: function() {
                    return authorized;
                }
            },
            $domain: {
                enumerable: false,
                get: function() {
                    return domain;
                }
            },
            $user: {
                enumerable: false,
                get: function() {
                    return user;
                }
            },
            $requestContext: {
                enumerable: false,
                get: function() {
                    return requestContext;
                }
            },
            $uiOnDemand: {
                enumerable: false,
                get: function() {
                    return uiOnDemand;
                }
            }
        });

    return context;
}
function verifyDownloadAccess(req) {
    if (
        req.user ||
        (req.query._t0 &&
            (req.fileAccess = infrastructure.verifyScopedToken(
                "download",
                req.query._t0
            )))
    )
        return true;

    return false;
}
function processFileDownload(res, er, data, description) {
    if (er) return sendResponse.call(res, er);

    debug(description);
    res.append("Content-Type", description.mime);
    res.append(
        "Content-Disposition",
        "attachment; filename=" + description.originalName
    );
    res.send(data);
}
function verifyProcessorAccessForDownload(req, res, next) {
    if (!req.query._t1 || !verifyDownloadAccess(req)) return false;
    let interval = (config.download && config.download.processorTTL) || 5000;

    //its a processor based download.
    return !async.waterfall(
        [
            fn => {
                let id = req.params.id,
                    query = getObjectIdOrQuery(id, { uid: id });
                dynamoEngine.queryProcessor(
                    query,
                    { one: true },
                    (er, processor) => {
                        if (er) return fn(er);
                        if (!processor)
                            return fn(
                                new Error(
                                    "Sorry please confirm download link is correct"
                                )
                            );
                        //confirm if the object in the scopedtoken matches the id of the processor to run.
                        if (
                            !req.fileAccess ||
                            (typeof req.fileAccess.data == "string" &&
                                req.fileAccess.data !== id) ||
                            (typeof req.fileAccess.data == "object" &&
                                req.fileAccess.data.id !== id)
                        )
                            return fn(
                                new Error("Processor in token does not match")
                            );
                        req.processor = processor;
                        fn();
                    }
                );
            },

            //use timeouts because this functions dont properly support callback syntax.
            async.timeout(
                ensureProcessorCanRunStandalone.bind(null, req, res),
                interval
            )
        ],
        er => {
            //abondon etimeouts because its assumed the functions have sent the results.
            if (er && er.code == "ETIMEDOUT") return;
            if (er) return unauthorized(req, res);

            return next();
        }
    );
}
function checkIfClaimIsRequired(type, value, req, res, next) {
    infrastructure.getClaims(
        {
            type: type,
            value: value(req)
        },
        function(er, result) {
            if (er) return unauthorized(req, res);
            if (result.length) return unauthorized(req, res);
            debug("a claim is not required for this request");
            req._claimNotRequired = true;
            next();
        }
    );
}

function _init() {
    function _getIconForDefaultProcess(proc) {
        let title = proc.title.toLowerCase();
        if (title.indexOf("processor") !== -1) return "computer";
        if (title.indexOf("schema") !== -1) return "folder";
        if (title.indexOf("lib") !== -1) return "storage";
        if (title.indexOf("create") !== -1) return "developer_board";
        if (title.indexOf("process") !== -1) return "memory";
    }
    infrastructure.init(config.admin.username, config.admin.password, function(
        er
    ) {
        if (er) throw er;
        dynamoEngine.on("error", function(er) {
            debug("an error occurred!!!");
            debug(er);
        });
        dynamoEngine.on("default-process-created", function(proc) {
            //apply for all the claims required in this process.
            //          debugger;
            async.waterfall(
                [
                    infrastructure.saveClaim.bind(infrastructure, {
                        type: lib.Infrastructure.constants.CLAIMS.PROCESS,
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
                            function(er, role) {
                                if (er) throw er;
                                infrastructure.getClaims(
                                    {
                                        type:
                                            infrastructure.adminClaims
                                                .manage_default_process
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
                function(er, menu) {
                    if (er) throw er;
                }
            );
        });
        dynamoEngine.on("default-processor-created", function(proc) {
            infrastructure.saveClaim(
                {
                    type: lib.Infrastructure.constants.CLAIMS.PROCESSOR,
                    description: proc.title,
                    value: proc._id
                },
                function(er, claim) {
                    infrastructure.addClaimToRole(
                        infrastructure.defaultRole,
                        null,
                        claim,
                        function(er, role) {
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
        dynamoEngine.init(function(er) {
            if (er) throw er;
            threadPool.start();
        });
    });
}

var ensureHasProcessClaim = checkClaim.bind(
        null,
        lib.Infrastructure.constants.CLAIMS.PROCESS,
        checkId,
        checkIfClaimIsRequired
    ),
    ensureHasProcessorClaim = checkClaim.bind(
        null,
        lib.Infrastructure.constants.CLAIMS.PROCESSOR,
        checkId,
        checkIfClaimIsRequired
    ),
    verifyProcessIfRequired = verifyIfRequired.bind(null, req => req.process),
    verifyProcessorIfRequired = verifyIfRequired.bind(
        null,
        req => req.processor
    );
/*
    Identity Server
 */
var server = oauth2orize.createServer();
server.exchange(
    oauth2orize.exchange.password(function(
        client,
        username,
        password,
        scope,
        done
    ) {
        infrastructure.login(
            scope.length ? scope[0] : null,
            client,
            username,
            password,
            done
        );
    })
);

server.exchange(
    oauth2orize.exchange.refreshToken(function(
        client,
        refreshToken,
        scope,
        done
    ) {
        infrastructure.refreshToken(
            scope.length ? scope[0] : null,
            client,
            refreshToken,
            done
        );
    })
);
passport_auth.init(infrastructure);
app.use(_clientAuthentication);
app.use(passport.initialize());
app.use("/auth/token", [
    passport.authenticate(["clientPassword"], {
        session: false
    }),
    server.token(),
    unauthorized
]);
admin.get("/claimable", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_claims,
        emptyVal
    ),
    function(req, res) {
        dynamoEngine.queryProcessor(
            {},
            { fields: { title: 1 }, noTransformaton: true },
            (er, processors) => {
                if (er) return sendResponse.call(res, er);

                dynamoEngine.queryProcess(
                    {},
                    { fields: { title: 1 }, noTransformaton: true },
                    (er, processes) => {
                        if (er) return sendResponse.call(res, er);

                        sendResponse.call(
                            res,
                            null,
                            processors
                                .map(x => ({
                                    displayLabel: x.title,
                                    _id: x._id
                                }))
                                .concat(
                                    processes.map(x => ({
                                        displayLabel: x.title,
                                        _id: x._id
                                    }))
                                )
                        );
                    }
                );
            }
        );
    }
]);

admin.post("/migration", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_migrations,
        emptyVal
    ),
    function(req, res) {
        infrastructure.saveMigration(
            req.body,
            createContext(req),
            sendResponse.bind(res)
        );
    }
]);

admin.post("/user", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_users,
        emptyVal
    ),
    function(req, res) {
        infrastructure.register(req.body, sendResponse.bind(res));
    }
]);

admin.post("/user/edit", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_users,
        emptyVal
    ),
    function(req, res) {
        infrastructure.updateUser(req.body, sendResponse.bind(res));
    }
]);
admin.post("/role", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_roles,
        emptyVal
    ),
    function(req, res) {
        infrastructure.createRole(req.body, sendResponse.bind(res));
    }
]);
admin.post("/role/edit", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_roles,
        emptyVal
    ),
    function(req, res) {
        infrastructure.updateRole(req.body, sendResponse.bind(res));
    }
]);
admin.post("/claim", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_claims,
        emptyVal
    ),
    function(req, res) {
        infrastructure.saveClaim(req.body, sendResponse.bind(res));
    }
]);

admin.delete("/claim/:id", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_claims,
        emptyVal
    ),
    function(req, res) {
        debug(req.params);
        infrastructure.deleteClaim(req.params.id, sendResponse.bind(res));
    }
]);

admin.post("/menu", [
    verify,
    checkClaim.bind(null, infrastructure.adminClaims.can_manage_menu, emptyVal),
    function(req, res) {
        infrastructure.saveMenu(req.body, sendResponse.bind(res));
    }
]);

admin.get("/acl", [
    function(req, res) {
        if (req.headers.authorization) {
            verify(req, res, function() {
                //             debugger;
                infrastructure.acl(
                    req.user.username,
                    req.user.domain,
                    req.user.client.clientId,
                    req.query.category,
                    function(er, menu) {
                        if (er) return sendResponse.call(res, er);

                        dynamoEngine.queryProcessor(
                            {
                                uid: dynamo.constants.UIDS.PROCESSOR.MENU_FILTER
                            },
                            { one: true },
                            function(er, proc) {
                                if (er) return sendResponse.call(res, er);
                                if (!proc)
                                    return sendResponse.call(res, null, menu);
                                debug("running menu filter...");
                                debug(req.user);
                                const run = () => {
                                    dynamoEngine.runProcessor(
                                        Object.assign(createContext(req), {
                                            menu
                                        }),
                                        proc,
                                        sendResponse.bind(res)
                                    );
                                };

                                if (req.user) {
                                    return getDomain(
                                        req.user.domain,
                                        req,
                                        er => {
                                            if (er)
                                                return sendResponse.call(
                                                    res,
                                                    er
                                                );
                                            run();
                                        }
                                    );
                                }
                                run();
                            }
                        );
                    }
                );
            });
        } else {
            let query = req.query;
            if (!query.category) {
                return sendResponse.call(
                    res,
                    new Error(
                        `missing parameters , kindly ensure category is set`
                    ),
                    401
                );
            }
            infrastructure.externalAcl(
                query.domain,
                query.clientId,
                query.category,
                sendResponse.bind(res)
            );
        }
    }
]);

admin.get("/dynamo/schemas", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_migrations,
        emptyVal
    ),
    function(req, res) {
        dynamoEngine.allEntityConfigurations(
            true,
            true,
            sendResponse.bind(res)
        );
    }
]);

admin.get("/dynamo/entities", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_migrations,
        emptyVal
    ),
    function(req, res) {
        let query = getRangeQuery(req, true),
            _filter,
            options = {
                sort: { _id: -1 },
                limit: (req.query.count && parseInt(req.query.count)) || 10
            },
            _continue = (items, er, count) => {
                if (er) return sendResponse.call(res, er);

                return sendResponse.call(res, null, {
                    items,
                    total: count
                });
            };
        if (req.query._id) query._id = dynamoEngine.createId(req.query._id);

        if (req.query.filter)
            Object.assign(query, (_filter = getMongoQuery(req.query.filter)));

        if (req.query.type == "Schema") {
            return dynamoEngine.allEntityConfigurations(
                true,
                false,
                query,
                options,
                (er, items) => {
                    if (er) return sendResponse.call(res, er);

                    dynamoEngine.countConfigurations(
                        _filter || {},
                        _continue.bind(null, items)
                    );
                }
            );
        }
        options.full = true;
        options.noTransformaton = true;
        dynamoEngine.query(req.query.type, query, options, (er, items) => {
            if (er) return sendResponse.call(res, er);
            dynamoEngine.count(
                req.query.type,
                _filter || {},
                _continue.bind(null, items)
            );
        });
    }
]);

admin.get("/thirdparty/:db_name/:query_type?", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_migrations,
        emptyVal
    ),
    function(req, res) {
        let filter;
        if (req.query.filter) filter = getMongoQuery(req.query.filter);
        if (req.query.lastId) req.query._id = req.query.lastId;

        utils.runThirdPartyMigrationProcessor(
            req.params.db_name,
            Object.assign(createContext(req), {
                filter,
                isEntityRequest: req.params.query_type !== "schema"
            }),
            dynamoEngine,
            (er, items) => {
                if (er) return sendResponse.call(res, er);
                return sendResponse.call(res, null, items);
            }
        );
    }
]);

admin.get("/schemas", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_migrations,
        emptyVal
    ),
    function(req, res) {
        infrastructure.getSchemas(sendResponse.bind(res));
    }
]);

admin.get("/entities", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_migrations,
        emptyVal
    ),
    function(req, res) {
        let query = getRangeQuery(req);
        if (req.query._id) query._id = req.query._id;
        if (req.query.filter)
            Object.assign(query, getMongoQuery(req.query.filter));

        debug(query);
        let middle =
            req.query.type[0].toUpperCase() + req.query.type.substring(1);
        infrastructure[`get${middle}Range`](
            query,
            parseInt(req.query.count),
            sendResponse.bind(res)
        );
    }
]);

admin.get("/migration", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_migrations,
        emptyVal
    ),
    function(req, res) {
        infrastructure.getMigrationRange(
            Object.assign({}, getRangeQuery(req)),
            parseInt(req.query.count),
            sendResponse.bind(res)
        );
    }
]);

admin.get("/migration/:id", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_migrations,
        emptyVal
    ),
    function(req, res) {
        infrastructure.getMigrationById(
            { _id: req.params.id },
            sendResponse.bind(res)
        );
    }
]);

admin.get("/user", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_users,
        emptyVal
    ),
    function(req, res) {
        infrastructure.getUserRange(
            Object.assign(
                {},
                (req.query.domain && { domain: req.query.domain }) || {},
                (req.query.username && {
                    username: toRegex(req.query.username)
                }) ||
                    {},
                getRangeQuery(req)
            ),
            parseInt(req.query.count),
            sendResponse.bind(res)
        );
    }
]);

admin.get("/user/byid/:id", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_users,
        emptyVal
    ),
    function(req, res) {
        infrastructure.getUserById(
            { _id: req.params.id },
            sendResponse.bind(res)
        );
    }
]);

admin.get("/role", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_roles,
        emptyVal
    ),
    function(req, res) {
        if (!req.query.all)
            return infrastructure.getRoleRange(
                Object.assign(
                    (req.query.domain && { domain: req.query.domain }) || {},
                    (req.query.name && { name: toRegex(req.query.name) }) || {},
                    getRangeQuery(req)
                ),
                parseInt(req.query.count),
                sendResponse.bind(res)
            );

        infrastructure.getRoles({}, sendResponse.bind(res));
    }
]);
admin.get("/role/:id", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_roles,
        emptyVal
    ),
    function(req, res) {
        infrastructure.getRole(req.params.id, sendResponse.bind(res));
    }
]);

admin.get("/menu/:id", [
    verify,
    checkClaim.bind(null, infrastructure.adminClaims.can_manage_menu, emptyVal),
    function(req, res) {
        infrastructure.getMenu(req.params.id, sendResponse.bind(res));
    }
]);
admin.get("/claim", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_claims,
        emptyVal
    ),
    function(req, res) {
        infrastructure.getClaims({}, sendResponse.bind(res));
    }
]);

admin.get("/claim/paged", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_claims,
        emptyVal
    ),
    function(req, res) {
        infrastructure.getClaimRange(
            Object.assign(
                (req.query.description && {
                    description: toRegex(req.query.description)
                }) ||
                    {},
                getRangeQuery(req)
            ),
            parseInt(req.query.count),
            sendResponse.bind(res)
        );
    }
]);

admin.post("/domain", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_domains,
        emptyVal
    ),
    function(req, res) {
        let files = [req.body.logo, req.body.image];
        fileUpload.isPerm(files, (er, results) => {
            if (er) return sendResponse.call(res, er);
            let tasks = results.reduce((sum, x, index) => {
                if (!!!x)
                    sum.push(
                        fileUpload.moveToPermanentSite.bind(
                            fileUpload,
                            files[index],
                            true // this file should be available to everyone.
                        )
                    );
                return sum;
            }, []);
            if (tasks.length)
                async.parallel(tasks, er => {
                    if (er) return sendResponse.call(res, er);
                    infrastructure.saveDomain(req.body, sendResponse.bind(res));
                });
            else infrastructure.saveDomain(req.body, sendResponse.bind(res));
        });
    }
]);

admin.get("/domain", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_domains,
        emptyVal
    ),
    function(req, res) {
        infrastructure.getDomains({}, sendResponse.bind(res));
    }
]);

admin.get("/domain/paged", [
    verify,
    checkClaim.bind(
        null,
        infrastructure.adminClaims.can_manage_domains,
        emptyVal
    ),
    function(req, res) {
        infrastructure.getDomainRange(
            Object.assign(
                (req.query.name && { name: toRegex(req.query.name) }) || {},
                getRangeQuery(req)
            ),
            parseInt(req.query.count),
            sendResponse.bind(res)
        );
    }
]);

admin.get("/menu", [
    verify,
    checkClaim.bind(null, infrastructure.adminClaims.can_manage_menu, emptyVal),
    function(req, res) {
        infrastructure.getMenuRange(
            Object.assign(
                (req.query.title && {
                    displayLabel: toRegex(req.query.title)
                }) ||
                    {},
                getRangeQuery(req)
            ),
            parseInt(req.query.count),
            sendResponse.bind(res)
        );
    }
]);

processors.param("id", function(req, res, next, id) {
    debug("fetching processor " + id);
    var query = getObjectIdOrQuery(id, { uid: id });
    debug(query);
    dynamoEngine.queryProcessor(
        query,
        {
            one: true
        },
        function(er, proc) {
            if (er)
                return (
                    res.status(500),
                    res.send({
                        message:
                            "An error occurred while fetching the processor",
                        error_description: er.message
                    })
                );
            if (!proc)
                return (
                    res.status(404),
                    res.send({
                        message: "Could not find processor"
                    })
                );

            req.processor = proc;
            next();
        }
    );
});

processes.param("id", function(req, res, next, id) {
    debug("fetching process");
    var query = getObjectIdOrQuery(id, { uid: id });

    dynamoEngine.queryProcess(
        query,
        {
            one: true,
            full: true
        },
        function(er, proc) {
            if (er)
                return (
                    res.status(500),
                    res.send({
                        message: "An error occurred while fetching the process",
                        error_description: er.message
                    })
                );
            if (!proc)
                return (
                    res.status(404),
                    res.send({
                        message: "Could not find process"
                    })
                );
            debug(`process found ${JSON.stringify(proc, null, " ")}`);
            req.process = proc;
            next();
        }
    );
});

processes.get("/describe/:id", [
    verifyProcessIfRequired,
    ensureHasProcessClaim,
    ensureProcessContext,
    function(req, res) {
        debugger;
        const describe = () =>
            req.process.describe(
                Object.assign(req.query || {}, createContext(req)),
                function(er, description, fetchedData) {
                    sendResponse.call(res, er, {
                        description: description,
                        data: fetchedData
                    });
                }
            );
        if (req.user) {
            return getDomain(req.user.domain, req, er => {
                if (er) return sendResponse.call(res, er);
                describe();
            });
        }

        describe();
    }
]);

processors.get("/upgrade", function(req, res) {
    dynamoEngine.queryLib({}, (er, libs) => {
        if (er) return sendResponse.call(res, er);
        async.parallel(libs.map(x => x.save.bind(x)), er => {
            if (er) return sendResponse.call(res, er);
            //successfully saved all libs
            dynamoEngine.queryProcessor({}, (er, ps) => {
                if (er) return sendResponse.call(res, er);
                async.parallel(ps.map(x => x.save.bind(x)), er => {
                    if (er) return sendResponse.call(res, er);
                    //successfully saved all processors
                    return sendResponse.call(res, null, {
                        result: "successfully saved libraries and processors"
                    });
                });
            });
        });
    });
});

processes.post("/run/:id", [
    verifyProcessIfRequired,
    ensureHasProcessClaim,
    ensureProcessContext,
    function(req, res) {
        const send = () =>
            req.process.run(createContext(req), sendResponse.bind(res));
        if (req.user) {
            //populate domain info.
            return getDomain(req.user.domain, req, er => {
                if (er) return sendResponse.call(res, er);
                send();
            });
        }
        send();
    }
]);

processors.use("/run/:id", [
    ensureProcessorCanRunStandalone,
    verifyProcessorIfRequired,
    ensureHasProcessorClaim,
    function(req, res) {
        const send = () =>
            dynamoEngine.runProcessor(
                createContext(req),
                req.processor,
                sendResponse.bind(res)
            );

        if (req.user) {
            return getDomain(req.user.domain, req, er => {
                if (er) return sendResponse.call(res, er);
                send();
            });
        }
        send();
    }
]);

uploadRouter.post("/", [
    upload.single("file"),
    function(req, res) {
        fileUpload.upload(req.user, req.file, req.body, function(er, result) {
            if (er) return sendResponse.call(res, er);
            sendResponse.call(res, null, result);
        });
    }
]);

uploadRouter.get("/preview/:id", function(req, res) {
    fileUpload.readFile(req.params.id, req.user, function(
        er,
        data,
        description
    ) {
        if (er) return sendResponse.call(res, er);

        fileParser.parse(description, data, res, req);
    });
});

downloadRouter.get("/:id", [
    verify.bind(
        new VerificationOverride((req, res, next) => {
            //verify using scoped token generator.
            if (verifyProcessorAccessForDownload(req, res, next)) return;
            if (verifyDownloadAccess(req)) return next();
            return unauthorized(req, res);
        })
    ),
    function(req, res) {
        if (!req.query._t1)
            return fileUpload.readFile(
                req.params.id,
                req.fileAccess,
                processFileDownload.bind(this, res)
            );
        async.waterfall(
            [
                fn => {
                    if (
                        typeof req.fileAccess.data == "object" &&
                        req.fileAccess.data.domain
                    )
                        return getDomain(req.fileAccess.data.domain, req, fn);
                    fn();
                },
                fn =>
                    dynamoEngine.runProcessor(
                        createContext(req),
                        req.processor,
                        fn
                    )
            ],
            (er, result) => {
                if (er) return sendResponse.call(res, er);
                if (!result || !result.id)
                    return sendResponse.call(
                        res,
                        new Error("Processor returned no file")
                    );

                fileUpload.readFile(
                    result.id,
                    result.user,
                    processFileDownload.bind(this, res)
                );
            }
        );
    }
]);

app.use(function(req, res, next) {
    res.set("Cache-Control", "no-cache");
    next();
});
app.use("/api/upload", [
    //check if user is logged in. If he's not still let him pass.
    verify.bind(new VerificationOverride((req, res, next) => next())),
    uploadRouter
]);
app.use("/api/download", [downloadRouter]);
app.use("/api/process", [processes]);
app.use("/api/processors", [processors]);
if (process.env.NODE_ENV !== "production")
    app.use("/api/doc", express.static("out"));
app.use("/api/admin", [admin]);
//error handler.
app.use(function(er, req, res, next) {
    debug("an error occurred!!!");
    debug(er);
    sendResponse.call(res, er);
});

const options = {
        key: fs.readFileSync("server-key.pem"),
        cert: fs.readFileSync("server-crt.pem"),
        ca: fs.readFileSync("ca-crt.pem"),
        requestCert: true,
        rejectUnauthorized: false
    },
    port = config.port || process.env.PORT || 443;
debug(`listening on ${port}`);
https.createServer(options, app).listen(port, _init);

if (process.env.profile !== "integrationTest")
    process.on("uncaughtException", function(er) {
        debug("something really bad has happened...\nlogging and exiting.");
        require("fs").writeFileSync(
            "./error/" + new Date().getTime() + ".txt",
            "::" + er.toString() + er.stack + "\t\n" + new Date().toString(),
            "utf-8"
        );

        process.exit(1);
    });
module.exports = app;
