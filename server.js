var express = require('express'),
    config = (require('./config'))[process.env.profile || 'dev'],
    dynamo = require('dynamo')(config),
    mongoose = require('mongoose'),
    passport = require('passport'),
    oauth2orize = require('oauth2orize'),
    passport_auth = require('./lib/passport_auth'),
    auth = require('./lib/auth'),
    passport = require('passport'),
    multer = require('multer'),
    upload = multer({
        dest: config.fileUpload ? config.fileUpload.tempDir : '/temp'
    }),
    fileParser = new(require('./lib/parser'))(config),
    async = require('async'),
    app = express(),
    https = require('https'),
    bodyParser = require('body-parser'),
    processes = express.Router(),
    morgan = require('morgan'),
    admin = express.Router(),
    uploadRouter = express.Router(),
    processors = express.Router(),
    entities = express.Router(),
    asyncValidators = express.Router(),
    dynamoEngine = new dynamo.Engine({
        entitiesRepository: new dynamo.EntityRepo({
            folder: './entities/'
        })
    });
mongoose.Promise = global.Promise;
let conn = mongoose.createConnection(config.data.web_url),
    userManager = new auth.UserManager({
        userStore: new auth.UserStore(mongoose, conn),
        clientStore: new auth.ClientStore(mongoose, conn),
        roleStore: new auth.RoleStore(mongoose, conn),
        claimsStore: new auth.ClaimsStore(mongoose, conn),
        tokenGen: new auth.TokenGenerator(config.token_generator),
        menuStore: new auth.MenuStore(mongoose, conn),
        defaultClaims: {
            manage_default_process: 'manage-default-process',
            create_process: {
                type: auth.UserManager.constants.CLAIMS.PROCESS,
                description: 'Edit a process',
                value: 'CREATE_PROCESS'
            }
        },
        webClient: config.clients.web,
        mobileClient: config.clients.mobile
    }),
    fileUpload = new(require('./lib/file_upload'))(config.fileUpload, mongoose, conn);

dynamoEngine.setInfrastructure({
    userManager,
    fileParser,
    fileUpload
});

app.use(bodyParser.json());
app.use(morgan('dev', {
    skip: function() {
        return !config.log.server;
    }
}));

function unauthorized(req, res) {
    res.status(401);
    res.send({
        error: 'Unauthorized',
        error_description: 'You are not authorized'
    });
}

function verify(req, res, next) {
    passport.authenticate('accessToken', {
        session: false
    }, function(er, user) {
        if (er) {
            sendResponse.call(res, er);
            return;
        }
        if (user) return req.user = user, next();

        return unauthorized(req, res);
    })(req, res, next);

}

function checkClaim(type, value, req, res, next) {

    var joinedClaims = req.user.roles.reduce(function(m, x) {
        return m.claims.concat(x.claims);
    }, {
        claims: []
    });
    var hasClaim = joinedClaims.filter(function(claim) {
        return claim.type == type && claim.value == value(req);
    });

    if (hasClaim.length) {
        next();
        return;
    }

    console.log(`looking for type:${type} and value:${value(req)}`);
    console.log(` in ${JSON.stringify(joinedClaims,null," ")}`);

    unauthorized(req, res);
}

function sendResponse(er, result) {

    if (er) return this.status(500), this.send({
        error: 'An unknown error occurred. We\' have to find out why. In the meantime try a refresh.',
        error_description: er.message
    });
    this.send(result);
}

function getRangeQuery(req) {
    var query = req.query.lastId ? (req.query.dir == 'prev' ? {
        _id: {
            $lt: req.query.lastId
        }
    } : {
        _id: {
            $gt: req.query.lastId
        }
    }) : {};
    return query;
}

function checkId(req) {
    return req.params.id;
}

function emptyVal() {
    return null;
}

function _clientAuthentication(req, res, next) {
    if (req.client.authorized) {
        var cert = req.socket.getPeerCertificate();
        if (cert.subject) {
            req._clientAuthorized = !!config.developers[cert.subject.CN] && cert.issuer.CN == config.CA.CN;
        }
    }
    next();
}

function createContext(req) {
    let context = req.body || {},
        authorized = req._clientAuthorized;
    Object.defineProperty(context, '$authorized', {
        enumerable: false,
        get: function() {
            return authorized;
        }
    });
    return context;
}

function _init() {
    userManager.init(config.admin.username, config.admin.password, function(er) {
        if (er) throw er;
        dynamoEngine.on('error', function(er) {
            console.log('an error occurred!!!');
            console.log(er);
        });
        dynamoEngine.on('default-process-created', function(proc) {
            //apply for all the claims required in this process.
            async.waterfall([
                userManager.saveClaim.bind(userManager, {
                    type: auth.UserManager.constants.CLAIMS.PROCESS,
                    description: proc.title,
                    value: proc._id
                }),
                function(result) {
                    var args = Array.prototype.slice.call(arguments);
                    var callback = args[args.length - 1];
                    userManager.addClaimToRole(userManager.defaultRole, null, result, function(er, role) {
                        if (er) throw er;
                        userManager.getClaims({
                            type: userManager.adminClaims.manage_default_process
                        }, callback);
                    });
                },
                function(result, callback) {
                    userManager.saveMenu({
                        displayLabel: proc.title,
                        group: 'Configuration',
                        icon: 'process',
                        claims: result.map(function(x) {
                            return x._id;
                        }),
                        type: 'DYNAMO',
                        value: proc._id,
                        category: 'MAINMENU',
                        client: userManager.webClient.clientId,
                    }, callback);
                }
            ], function(er, menu) {
                if (er) throw er;
            });
        });
        dynamoEngine.on('default-processor-created', function(proc) {
            userManager.saveClaim({
                type: auth.UserManager.constants.CLAIMS.PROCESSOR,
                description: proc.title,
                value: proc._id
            }, function(er, claim) {
                userManager.addClaimToRole(userManager.defaultRole, null, claim, function(er, role) {
                    if (er) console.log('an error occurred while adding claim to role:' + userManager.defaultRole);
                });
            });
        });
        dynamoEngine.init(function(er) {
            if (er)
                throw er;

        });
    });
}

var ensureHasProcessClaim = checkClaim.bind(null, auth.UserManager.constants.CLAIMS.PROCESS, checkId);
var ensureHasProcessorClaim = checkClaim.bind(null, auth.UserManager.constants.CLAIMS.PROCESSOR, checkId);
/*
    Identity Server
 */
var server = oauth2orize.createServer();
server.exchange(oauth2orize.exchange.password(function(client, username, password, scope, done) {
    userManager.login(scope.length ? scope[0] : null, client, username, password, done);
}));

server.exchange(oauth2orize.exchange.refreshToken(function(client, refreshToken, scope, done) {
    userManager.refreshToken(scope.length ? scope[0] : null, client, refreshToken, done);
}));
passport_auth.init(userManager);
app.use(_clientAuthentication);
app.use(passport.initialize());
app.use('/auth/token', [passport.authenticate(['clientPassword'], {
    session: false
}), server.token(), unauthorized]);


admin.post('/user', [checkClaim.bind(null, userManager.adminClaims.can_manage_users, emptyVal), function(req, res) {
    userManager.register(req.body, sendResponse.bind(res));
}]);
admin.post('/role', [checkClaim.bind(null, userManager.adminClaims.can_manage_roles, emptyVal), function(req, res) {
    userManager.createRole(req.body, sendResponse.bind(res));
}]);
admin.post('/role/edit', [checkClaim.bind(null, userManager.adminClaims.can_manage_roles, emptyVal), function(req, res) {
    userManager.updateRole(req.body, sendResponse.bind(res));
}]);
admin.post('/claim', [checkClaim.bind(null, userManager.adminClaims.can_manage_claims, emptyVal), function(req, res) {
    userManager.saveClaim(req.body, sendResponse.bind(res));
}]);

admin.post('/menu', [checkClaim.bind(null, userManager.adminClaims.can_manage_menu, emptyVal), function(req, res) {
    userManager.saveMenu(req.body, sendResponse.bind(res));
}]);

admin.get('/acl', [function(req, res) {
    userManager.acl(req.user.username, req.user.domain, req.user.client.clientId, sendResponse.bind(res));
}]);

admin.get('/user', [checkClaim.bind(null, userManager.adminClaims.can_manage_users, emptyVal), function(req, res) {

    userManager.getUserRange(getRangeQuery(req), parseInt(req.query.count), sendResponse.bind(res));
}]);

admin.get('/role', [checkClaim.bind(null, userManager.adminClaims.can_manage_roles, emptyVal), function(req, res) {
    userManager.getRoleRange(getRangeQuery(req), parseInt(req.query.count), sendResponse.bind(res));
}]);
admin.get('/role/:id', [checkClaim.bind(null, userManager.adminClaims.can_manage_roles, emptyVal), function(req, res) {
    userManager.getRole(req.params.id, sendResponse.bind(res));
}]);
admin.get('/menu/:id', [checkClaim.bind(null, userManager.adminClaims.can_manage_menu, emptyVal), function(req, res) {
    userManager.getMenu(req.params.id, sendResponse.bind(res));
}]);
admin.get('/claim', [checkClaim.bind(null, userManager.adminClaims.can_manage_claims, emptyVal), function(req, res) {
    userManager.getClaims({}, sendResponse.bind(res));
}]);

admin.get('/claim/paged', [checkClaim.bind(null, userManager.adminClaims.can_manage_claims, emptyVal), function(req, res) {
    userManager.getClaimRange(getRangeQuery(req), parseInt(req.query.count), sendResponse.bind(res));
}]);


admin.get('/menu', [checkClaim.bind(null, userManager.adminClaims.can_manage_menu, emptyVal), function(req, res) {
    userManager.getMenuRange(getRangeQuery(req), parseInt(req.query.count), sendResponse.bind(res));
}]);



processors.param('id', function(req, res, next, id) {
    dynamoEngine.queryProcessor({
        _id: id
    }, {
        one: true
    }, function(er, proc) {
        if (er) return res.status(500), res.send({
            message: 'An error occurred while fetching the processor',
            obj: er
        });
        if (!proc) return res.status(404), res.send({
            message: 'Could not find processor'
        });

        req.processor = proc;
        next();
    });
});

processes.param('id', function(req, res, next, id) {

    var query = {};
    if (dynamoEngine.isValidID(id))
        query._id = id;
    else
        query.uid = id;
    dynamoEngine.queryProcess(query, {
        one: true
    }, function(er, proc) {
        if (er) return res.status(500), res.send({
            message: 'An error occurred while fetching the process',
            obj: er
        });
        if (!proc) return res.status(404), res.send({
            message: 'Could not find process'
        });
        req.process = proc;
        next();
    });
});

processes.get('/describe/:id', [ensureHasProcessClaim, function(req, res) {

    var query = req.query;
    query.$user = req.user;
    req.process.describe(query, function(er, description, fetchedData) {
        sendResponse.call(res, er, {
            description: description,
            data: fetchedData
        });
    });
}]);

processes.post('/run/:id', [ensureHasProcessClaim, function(req, res) {
    req.process.run(createContext(req), sendResponse.bind(res));
}]);

processors.post('/run/:id', [ensureHasProcessorClaim, function(req, res) {
    dynamoEngine.runProcessor(createContext(req), req.processor, sendResponse.bind(res));
}]);

processors.get('/', function(req, res) {
    dynamoEngine.queryProcessor({}, sendResponse.bind(res));
});

processes.get('/', function(req, res) {
    dynamoEngine.queryProcess({}, sendResponse.bind(res));
});


uploadRouter.post('/', [upload.single('file'), function(req, res) {
    fileUpload.upload(req.user, req.file, req.body, function(er, result) {
        if (er) return sendResponse.call(res, er);
        sendResponse.call(res, null, result);
    });
}]);

uploadRouter.get('/preview/:id', function(req, res) {
    fileUpload.readFile(req.params.id, function(er, data, description) {
        if (er) return sendResponse.call(res, er);

        fileParser.parse(description, data, res, req);
    });
});


app.use('/api/upload', [verify, uploadRouter]);
app.use('/api/process', [verify, processes]);
app.use('/api/processors', [verify, processors]);
app.use('/api/doc', express.static('out'));
app.use('/api/admin', [verify, admin]);
app.use(function(er, req, res, next) {
    console.log('an error occurred!!!');
    console.error(er);
    sendResponse.call(res, er);
});


if (process.env.NODE_ENV == 'production') {
    const fs = require('fs'),
        options = {
            key: fs.readFileSync('server-key.pem'),
            cert: fs.readFileSync('server-crt.pem'),
            ca: fs.readFileSync('ca-crt.pem'),
            requestCert: true,
            rejectUnauthorized: false
        },
        port = config.port || process.env.PORT || 443;
    console.log(`listening on ${port}`);
    https.createServer(options, app).listen(port, _init);
    return;
}

app.listen(config.port || process.env.PORT || 4500, _init);

process.on('uncaughtException', function(er) {
    console.log('something really bad has happened');
    require('fs').writeFileSync('./error/' + new Date().getTime() + '.txt', '::' + er.toString() + er.stack + '\t\n' + (new Date().toString()), 'utf-8');
    process.exit(1);
});
module.exports = app;