/**
 * Menu item to be displayed by both the mobile and website.
 * @param {Object} opts Configuration object.
 */
function Menu(opts) {
	if (!opts) throw new Error("Menu item is missing configuration");

	if (!opts.displayLabel && !opts.icon) {
		debug(opts);
		throw new Error(
			"All menu items must either have a displayLabel or a display icon"
		);
	}

	if (!opts.type) throw new Error("All menu items require a valid type");

	if (!opts.category) throw new Error("All menu items must have a category");

	Object.assign(this, opts);
	this.claims = opts.claims || [];
}
module.exports = Menu;
