const XLSX = require("xlsx");
module.exports = function(description, data, res) {
	_parseOnly(description, data, function(er, rows) {
		if (er) return res.status(500), res.send(er);
		res.send(rows);
	});
};

module.exports.id = /(xlsx|csv)/i;

module.exports.parseOnly = _parseOnly;

function _parseOnly(description, data, fn) {
	try {
		let workbook = XLSX.read(data),
			rows = [];
		workbook.SheetNames.forEach(function(sheetName) {
			rows = rows.concat(
				XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
			);
		});
		return fn(null, rows);
	} catch (e) {
		fn(e);
	}
}
