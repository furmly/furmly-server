let Threads = require("webworker-threads");
module.exports = function(poolSize, defaultDefinitions = []) {
	let workerFunc =
		"let func = {fn};" +
		"this.onmessage = function(event) {" +
		"	func(event.data, (er, result) => {" +
		"		postMessage({ er, result });" +
		"		this.close();" +
		"	});" +
		"};";
	workerFunc =
		defaultDefinitions.map(x => x.toString()).join("\n") + workerFunc;
	this._poolSize = poolSize;
	this._pendingTasks = [];
	this._runningTasks = 0;
	if (poolSize <= 0) throw new Error("illegal Thread Pool size");

	function UnitOfWork(context, fn, callback) {
		this.run = function(pool) {
			let self = this,
				replaced = workerFunc.replace("{fn}", fn.toString()),
				compiledFunc = new Function(replaced),
				worker = new Threads.Worker(compiledFunc);
			worker.onmessage = function({ data }) {
				callback(data.er, data.result);
				pool.completed(self);
			};
			worker.postMessage(context);
		};
	}

	this.start = function() {
		setImmediate(() => {
			if (this._runningTasks <= this._poolSize) {
				let work = this._pendingTasks.pop();
				if (work) {
					this._runningTasks++;
					work.run(this);
				}
			}
			setTimeout(this.start.bind(this), 1000);
		});
	};
	this.completed = function() {
		this._runningTasks--;
	};
	this.run = function(context, fn, callback) {
		this._pendingTasks.push(new UnitOfWork(context, fn, callback));
	};
};
