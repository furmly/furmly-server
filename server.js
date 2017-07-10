var express = require('express'),
	config = (require('./config'))[process.env.profile || 'dev'],
	dynamo = require('dynamo')(config),
	mongoose = require('mongoose'),
	passport = require('passport'),
	oauth2orize = require('oauth2orize'),
	passport_auth = require('./lib/passport_auth'),
	auth = require('./lib/auth'),
	passport = require('passport'),
	async = require('async'),
	app = express(),
	bodyParser = require('body-parser'),
	processes = express.Router(),
	morgan = require('morgan'),
	admin = express.Router(),
	processors = express.Router(),
	entities = express.Router(),
	asyncValidators = express.Router(),
	dynamoEngine = new dynamo.Engine({
		entitiesRepository: new dynamo.EntityRepo({
			folder: './entities/'
		})
	}),
	conn = mongoose.createConnection(config.data.web_url);
var userManager = new auth.UserManager({
	userStore: new auth.UserStore(mongoose, conn),
	clientStore: new auth.ClientStore(mongoose, conn),
	roleStore: new auth.RoleStore(mongoose, conn),
	claimsStore: new auth.ClaimsStore(mongoose, conn),
	tokenGen: new auth.TokenGenerator(config.token_generator),
	menuStore: new auth.MenuStore(mongoose, conn),
	defaultClaims: {
		manage_default_process: 'manage-default-process'
	},
	webClient: config.clients.web,
	mobileClient: config.clients.mobile
});
var constants = {
	CLAIMS: {
		PROCESSOR: 'http://www.dynamo.com/processor',
		PROCESS: 'http://www.dynamo.com/process'
	}
};
dynamoEngine.userManager = userManager;

app.use(bodyParser.json());

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

var ensureHasProcessClaim = checkClaim.bind(null, constants.CLAIMS.PROCESS, checkId);
var ensureHasProcessorClaim = checkClaim.bind(null, constants.CLAIMS.PROCESSOR, checkId);
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
	console.log('query:');
	console.log(req.query);
	var query = req.query;
	if (Object.keys(req.query).length === 0) {
		query = null;
	}
	req.process.describe(query, function(er, description, fetchedData) {
		sendResponse.call(res, er, {
			description: description,
			data: fetchedData
		});
	});
}]);

processes.post('/run/:id', [ensureHasProcessClaim, function(req, res) {
	req.process.run(req.body || {}, sendResponse.bind(res));
}]);

processors.post('/run/:id', [ensureHasProcessorClaim, function(req, res) {
	dynamoEngine.runProcessor(req.body, req.processor, sendResponse.bind(res));
}]);

processors.get('/', function(req, res) {
	dynamoEngine.queryProcessor({}, sendResponse.bind(res));
});

processes.get('/', function(req, res) {
	dynamoEngine.queryProcess({}, sendResponse.bind(res));
});

app.use(morgan('dev', {
	skip: function() {
		return !config.log.server;
	}
}));

app.use('/api/process', [verify, processes]);
app.use('/api/processors', [verify, processors]);
app.use('/api/doc', express.static('out'));
app.use('/api/admin', [verify, admin]);
app.use(function(er, req, res, next) {
	console.log('an error occurred!!!');
	sendResponse.call(res, er);
});
app.listen(4500, function() {
	userManager.init(config.admin.username, config.admin.password, function(er) {
		if (er) throw er;
		dynamoEngine.on('error', function(er) {
			console.log('an error occurred!!!');
		});
		dynamoEngine.on('default-process-created', function(proc) {
			//apply for all the claims required in this process.
			async.waterfall([
				userManager.saveClaim.bind(userManager, {
					type: constants.CLAIMS.PROCESS,
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
				type: constants.CLAIMS.PROCESSOR,
				value: proc._id
			}, function(er, claim) {
				userManager.addClaimToRole(userManager.defaultRole, null, claim, function(er, role) {
					if (er) console.log('an error occurred while adding claim to role:' + userManager.defaultRole);
				});
			});
		});
		dynamoEngine.init(function(er) {
			if (er) {
				throw er;
			}

			dynamoEngine.entitiesRepository.getConfigNames(function(er, ext) {
				console.log(ext);
			});
		});
	});
});

process.on('uncaughtException', function(er) {
	console.log('something really bad has happened');
	require('fs').writeFileSync('./error/' + new Date().getTime() + '.txt', '::' + er.toString() + er.stack + '\t\n' + (new Date().toString()), 'utf-8');
	process.exit(1);
});
module.exports = app;