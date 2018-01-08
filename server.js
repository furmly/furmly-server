var express = require("express"),
    config = require("./config")[
        process.env.profile || process.env.NODE_ENV || "dev"
    ],
    dynamo = require("dynamo")(config),
    debug = require("debug")("dynamo-web-server"),
    mongoose = require("mongoose"),
    uuid = require("uuid"),
    url = require("url"),
    crypto = require("crypto"),
    passport = require("passport"),
    oauth2orize = require("oauth2orize"),
    passport_auth = require("./lib/passport_auth"),
    auth = require("./lib/auth"),
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
            require("os").cpus().length
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
            storeTTL: config.entRepo.storeTTL
        })
    });
//debug(config.clients);
mongoose.Promise = global.Promise;
let conn = mongoose.createConnection(config.data.web_url),
    userManager = new auth.UserManager({
        domainStore: new auth.DomainStore(mongoose, conn),
        userStore: new auth.UserStore(mongoose, conn),
        clientStore: new auth.ClientStore(mongoose, conn),
        roleStore: new auth.RoleStore(mongoose, conn),
        claimsStore: new auth.ClaimsStore(mongoose, conn),
        tokenGen: new auth.TokenGenerator(config.token_generator),
        menuStore: new auth.MenuStore(mongoose, conn),
        defaultClaims: {
            manage_default_process: "manage-default-process",
            create_process: {
                type: auth.UserManager.constants.CLAIMS.PROCESS,
                description: "Edit a process",
                value: "CREATE_PROCESS"
            }
        },
        webClient: config.clients.web,
        mobileClient: config.clients.mobile,
        config: config.userManager
    }),
    fileUpload = new (require("./lib/file_upload"))(
        config.fileUpload,
        mongoose,
        conn
    );

dynamoEngine.setInfrastructure({
    userManager,
    fileParser,
    fileUpload,
    threadPool,
    templating,
    request,
    url,
    uuid,
    crypto
});

app.use(
    morgan("dev", {
        skip: function() {
            return !config.log.server;
        }
    })
);
app.use(bodyParser.json());

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
        function(er, user) {
            if (er) {
                sendResponse.call(res, er);
                return;
            }
            debug(user || "user is null");
            if (user) return (req.user = user), next();

            return unauthorized(req, res);
        }
    )(req, res, next);
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

function getDomain(req, fn) {
    userManager.getDomains({ _id: req.user.domain }, (er, domains) => {
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
    });
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

function sendResponse(er, result, resultType) {
    if (er)
        return (
            debug(er),
            this.status(500),
            this.append("ErrorMessage", er.message),
            (this.statusMessage = er.message || "Unknown Error occurred"),
            this.send({
                error:
                    "An unknown error occurred. We' have to find out why. In the meantime try a refresh.",
                error_description: er.message
            })
        );

    this.send(result);
}

function getRangeQuery(req) {
    var query = req.query.lastId
        ? {
              _id: {
                  $lt: req.query.lastId
              }
          }
        : {};
    return query;
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

function checkIfClaimIsRequired(type, value, req, res, next) {
    userManager.getClaims(
        {
            type: type,
            value: value(req)
        },
        function(er, result) {
            if (er) return unauthorized(req, res);
            if (result.length) return unauthorized(req, res);
            debug("a claim is not required for this request");
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
    userManager.init(config.admin.username, config.admin.password, function(
        er
    ) {
        if (er) throw er;
        dynamoEngine.on("error", function(er) {
            debug("an error occurred!!!");
            debug(er);
        });
        dynamoEngine.on("default-process-created", function(proc) {
            //apply for all the claims required in this process.
            async.waterfall(
                [
                    userManager.saveClaim.bind(userManager, {
                        type: auth.UserManager.constants.CLAIMS.PROCESS,
                        description: proc.title,
                        value: proc._id
                    }),
                    function(result) {
                        var args = Array.prototype.slice.call(arguments);
                        var callback = args[args.length - 1];
                        userManager.addClaimToRole(
                            userManager.defaultRole,
                            null,
                            result,
                            function(er, role) {
                                if (er) throw er;
                                userManager.getClaims(
                                    {
                                        type:
                                            userManager.adminClaims
                                                .manage_default_process
                                    },
                                    callback
                                );
                            }
                        );
                    },
                    function(result, callback) {
                        userManager.saveMenu(
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
                                client: userManager.webClient.clientId
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
            userManager.saveClaim(
                {
                    type: auth.UserManager.constants.CLAIMS.PROCESSOR,
                    description: proc.title,
                    value: proc._id
                },
                function(er, claim) {
                    userManager.addClaimToRole(
                        userManager.defaultRole,
                        null,
                        claim,
                        function(er, role) {
                            if (er)
                                debug(
                                    "an error occurred while adding claim to role:" +
                                        userManager.defaultRole
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
        auth.UserManager.constants.CLAIMS.PROCESS,
        checkId,
        checkIfClaimIsRequired
    ),
    ensureHasProcessorClaim = checkClaim.bind(
        null,
        auth.UserManager.constants.CLAIMS.PROCESSOR,
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
        userManager.login(
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
        userManager.refreshToken(
            scope.length ? scope[0] : null,
            client,
            refreshToken,
            done
        );
    })
);
passport_auth.init(userManager);
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
    checkClaim.bind(null, userManager.adminClaims.can_manage_claims, emptyVal),
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

admin.post("/user", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_users, emptyVal),
    function(req, res) {
        userManager.register(req.body, sendResponse.bind(res));
    }
]);

admin.post("/user/edit", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_users, emptyVal),
    function(req, res) {
        userManager.updateUser(req.body, sendResponse.bind(res));
    }
]);
admin.post("/role", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_roles, emptyVal),
    function(req, res) {
        userManager.createRole(req.body, sendResponse.bind(res));
    }
]);
admin.post("/role/edit", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_roles, emptyVal),
    function(req, res) {
        userManager.updateRole(req.body, sendResponse.bind(res));
    }
]);
admin.post("/claim", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_claims, emptyVal),
    function(req, res) {
        userManager.saveClaim(req.body, sendResponse.bind(res));
    }
]);

admin.delete("/claim/:id", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_claims, emptyVal),
    function(req, res) {
        debug(req.params);
        userManager.deleteClaim(req.params.id, sendResponse.bind(res));
    }
]);

admin.post("/menu", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_menu, emptyVal),
    function(req, res) {
        userManager.saveMenu(req.body, sendResponse.bind(res));
    }
]);

admin.get("/acl", [
    function(req, res) {
        if (req.headers.authorization) {
            verify(req, res, function() {
                userManager.acl(
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
                                    return getDomain(req, er => {
                                        if (er)
                                            return sendResponse.call(res, er);
                                        run();
                                    });
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
                    )
                );
            }
            userManager.externalAcl(
                query.domain,
                query.clientId,
                query.category,
                sendResponse.bind(res)
            );
        }
    }
]);

admin.get("/user", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_users, emptyVal),
    function(req, res) {
        userManager.getUserRange(
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
    checkClaim.bind(null, userManager.adminClaims.can_manage_users, emptyVal),
    function(req, res) {
        userManager.getUserById({ _id: req.params.id }, sendResponse.bind(res));
    }
]);

admin.get("/role", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_roles, emptyVal),
    function(req, res) {
        if (!req.query.all)
            return userManager.getRoleRange(
                Object.assign(
                    (req.query.domain && { domain: req.query.domain }) || {},
                    (req.query.name && { name: toRegex(req.query.name) }) || {},
                    getRangeQuery(req)
                ),
                parseInt(req.query.count),
                sendResponse.bind(res)
            );

        userManager.getRoles({}, sendResponse.bind(res));
    }
]);
admin.get("/role/:id", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_roles, emptyVal),
    function(req, res) {
        userManager.getRole(req.params.id, sendResponse.bind(res));
    }
]);

admin.get("/menu/:id", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_menu, emptyVal),
    function(req, res) {
        userManager.getMenu(req.params.id, sendResponse.bind(res));
    }
]);
admin.get("/claim", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_claims, emptyVal),
    function(req, res) {
        userManager.getClaims({}, sendResponse.bind(res));
    }
]);

admin.get("/claim/paged", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_claims, emptyVal),
    function(req, res) {
        userManager.getClaimRange(
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
    checkClaim.bind(null, userManager.adminClaims.can_manage_domains, emptyVal),
    function(req, res) {
        userManager.saveDomain(req.body, sendResponse.bind(res));
    }
]);

admin.get("/domain", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_domains, emptyVal),
    function(req, res) {
        userManager.getDomains({}, sendResponse.bind(res));
    }
]);

admin.get("/domain/paged", [
    verify,
    checkClaim.bind(null, userManager.adminClaims.can_manage_domains, emptyVal),
    function(req, res) {
        userManager.getDomainRange(
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
    checkClaim.bind(null, userManager.adminClaims.can_manage_menu, emptyVal),
    function(req, res) {
        userManager.getMenuRange(
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
    let query = {};
    if (dynamoEngine.isValidID(id)) query._id = id;
    else query.uid = id;
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
                        obj: er
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
    var query = {};
    if (dynamoEngine.isValidID(id)) query._id = id;
    else query.uid = id;
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
                        obj: er
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
    function(req, res) {
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
            return getDomain(req, er => {
                if (er) return sendResponse.call(res, er);
                describe();
            });
        }

        describe();
    }
]);

processes.post("/run/:id", [
    verifyProcessIfRequired,
    ensureHasProcessClaim,
    function(req, res) {
        const send = () =>
            req.process.run(createContext(req), sendResponse.bind(res));
        if (req.user) {
            //populate domain info.
            return getDomain(req, er => {
                if (er) return sendResponse.call(res, er);
                send();
            });
        }
        send();
    }
]);

processors.use("/run/:id", [
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
            return getDomain(req, er => {
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
    fileUpload.readFile(req.params.id, function(er, data, description) {
        if (er) return sendResponse.call(res, er);

        fileParser.parse(description, data, res, req);
    });
});

downloadRouter.get("/download/:id", function(req, res) {
    fileUpload.readFile(req.params.id, function(er, data, description) {
        if (er) return sendResponse.call(res, er);

        res.append("Content-Type", description.mime);
        res.append(
            "Content-Disposition",
            "attachment; filename=" + description.originalName
        );
        res.send(data);
    });
});

app.use(function(req, res, next) {
    res.set("Cache-Control", "no-cache");
    next();
});
app.use("/api/upload", [verify, uploadRouter]);
app.use("/api/download", [verify, downloadRouter]);
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

const fs = require("fs"),
    options = {
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
