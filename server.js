var express = require('express'),
	dynamo = require('dynamo'),
	async = require('async'),
	app = express(),
	bodyParser = require('body-parser'),
	processes = express.Router(),
	processors = express.Router(),
	entities = express.Router(),
	asyncValidators = express.Router(),
	dynamoEngine = new dynamo.Engine({
		entitiesRepository: new dynamo.EntityRepo({
			folder: './entities/'
		})
	});

app.use(bodyParser.json());

function sendResponse(er, result) {
	if (er) return this.status(500), this.send({
		message: 'An unknown error occurred. We\' have to find out why. In the meantime try a refresh.',
		obj: er
	});
	this.send(result);
}

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

	dynamoEngine.queryProcess({
		_id: id
	}, {
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
processes.get('/describe/:id', function(req, res) {
	req.process.describe(sendResponse.bind(res));
});

processes.post('/run/:id', function(req, res) {
	req.process.run(req.body || {}, sendResponse.bind(res));
});

processors.post('/run/:id', function(req, res) {
	dynamoEngine.runProcessor(req.processor, sendResponse.bind(res));
});

processors.get('/', function(req, res) {
	dynamoEngine.queryProcessor({}, sendResponse.bind(res));
});

processes.get('/', function(req, res) {
	dynamoEngine.queryProcess({}, sendResponse.bind(res));
});

app.use(function(req, res, next) {
	console.log(req.url);
	next();
});
app.use('/api/process', processes);
app.use('/api/processors', processors);

app.listen(4500, function() {
	dynamoEngine.init(function(er) {
		if (er) {
			console.log('An error occurred while initializing app');
			throw er;
		}
		console.log('app initialized successfully..');
	});
});