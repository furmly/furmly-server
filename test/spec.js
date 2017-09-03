var chai = require("chai"),
	async = require("async"),
	fs = require("fs"),
	config = require("../config")[process.env.profile || "integrationTest"],
	mongoose = require("mongoose"),
	chaiHttp = require("chai-http");
chai.use(chaiHttp);
describe("Integration Tests", function() {
	var server,
		accessToken,
		domain = "http://test.com",
		total = 8;
	before(function(done) {
		this.timeout(15000);
		if (!fs.existsSync(config.fileUpload.tempDir)) {
			fs.mkdirSync(config.fileUpload.tempDir);
		}
		if (!fs.existsSync(config.fileUpload.permDir)) {
			fs.mkdirSync(config.fileUpload.permDir);
		}
		server = require("../server");
		setTimeout(function() {
			async.waterfall(
				[
					function(callback) {
						chai
							.request(server)
							.post("/auth/token")
							.send({
								client_id: config.clients.web.clientId,
								client_secret: config.clients.web.clientSecret,
								grant_type: "password",
								username: "admin",
								password: "admin",
								scope: ""
							})
							.end(function(er, res) {
								assert.isNull(er);
								assert.equal(res.status, 200);
								assert.isNotNull(res.body);
								assert.isObject(res.body);
								assert.isNotNull(res.body.access_token);
								accessToken = "Bearer " + res.body.access_token;
								callback();
							});
					},
					function(callback) {
						chai
							.request(server)
							.post("/api/admin/claim")
							.set("Authorization", accessToken)
							.send({
								type: "can-list-process",
								value: "1",
								description: "Can list process"
							})
							.end(callback);
					},
					function(res, callback) {
						assert.equal(res.status, 200);

						chai
							.request(server)
							.post("/api/admin/role")
							.set("Authorization", accessToken)
							.send({
								name: "admin",
								domain: domain,
								claim: [res.body._id]
							})
							.end(callback);
					},
					function(res, callback) {
						console.log(`created role in domain:${domain}`);
						assert.equal(res.status, 200);
						chai
							.request(server)
							.post("/api/admin/user")
							.set("Authorization", accessToken)
							.send({
								username: "admin",
								password: "password1234",
								domain: domain,
								roles: [res.body._id]
							})
							.end(callback);
					}
				],
				function(er, res) {
					assert.isNull(er);
					console.log("everything ran successfully");
					assert.equal(res.status, 200);
					assert.isObject(res.body);
					done();
				}
			);
		}, 2000);
	});

	after(function(done) {
		console.log("after executing...");
		var webConn = mongoose.createConnection(config.data.web_url);
		var dynConn = mongoose.createConnection(config.data.dynamo_url);
		webConn.dropDatabase(function(er) {
			dynConn.dropDatabase(function(er) {
				done();
			});
		});
	});
	describe("/api/admin", function() {
		it("should be able to get menu items", function(done) {
			//
			chai
				.request(server)
				.get("/api/admin/acl")
				.set("Authorization", accessToken)
				.end(function(err, res) {
					//console.log()
					assert.isNull(err);
					assert.isArray(res.body);
					assert.equal(res.body.length, total);
					done();
				});
		});
		it("should be able to paginate menu", function(done) {
			chai
				.request(server)
				.get("/api/admin/menu?count=2")
				.set("Authorization", accessToken)
				.end(function(err, res) {
					assert.isNull(err);
					assert.isObject(res.body);
					assert.isArray(res.body.items);
					assert.equal(res.body.items.length, 2);
					assert.equal(res.body.total, total);
					chai
						.request(server)
						.get(
							"/api/admin/menu?count=1&lastId=" +
								encodeURIComponent(res.body.items[1]._id)
						)
						.set("Authorization", accessToken)
						.end(function(err, res) {
							assert.isNull(err);
							assert.isObject(res.body);
							assert.isArray(res.body.items);
							assert.equal(res.body.items.length, 1);
							assert.equal(res.body.total, total);
							chai
								.request(server)
								.get(
									"/api/admin/menu?count=2&lastId=" +
										encodeURIComponent(
											res.body.items[0]._id
										)
								)
								.set("Authorization", accessToken)
								.end(function(err, res) {
									assert.isNull(err);
									assert.isObject(res.body);
									assert.isArray(res.body.items);
									assert.equal(res.body.items.length, 2);
									assert.equal(res.body.total, total);
									chai
										.request(server)
										.get(
											"/api/admin/menu?dir=prev&count=2&lastId=" +
												encodeURIComponent(
													res.body.items[0]._id
												)
										)
										.set("Authorization", accessToken)
										.end(function(err, res) {
											assert.isNull(err);
											assert.isObject(res.body);
											assert.isArray(res.body.items);
											assert.equal(
												res.body.items.length,
												2
											);
											assert.equal(res.body.total, total);
											done();
										});
								});
						});
				});
		});
	});
	describe("/api/process", function() {
		var process_accessToken;
		beforeEach(function(done) {
			chai
				.request(server)
				.post("/auth/token")
				.send({
					client_id: "test-client",
					client_secret: "test",
					grant_type: "password",
					username: "admin",
					password: "password1234",
					scope: domain
				})
				.end(function(er, res) {
					assert.isNull(er);
					assert.equal(res.status, 200);
					assert.isNotNull(res.body);
					assert.isObject(res.body);
					assert.isNotNull(res.body.access_token);
					process_accessToken = "Bearer " + res.body.access_token;
					done();
				});
		});

		// it("should be able to access processes it has access to", function(done) {
		// 	chai
		// 		.request(server)
		// 		.get("/api/process")
		// 		.set("Authorization", process_accessToken)
		// 		.end(function(err, res) {
		// 			assert.isNull(err);
		// 			assert.isArray(res.body);
		// 			assert.equal(res.body.length, 2);
		// 			done();
		// 		});
		// });
	});
});
