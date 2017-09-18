function Templating(config) {
	let ejs = require("ejs");
	this.config = config.templating;
	this.render = function(template, context) {
		return ejs.render(template, context);
	};
}

module.exports = function(config) {
	return new Templating(config);
};
