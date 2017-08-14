const XLSX = require("xlsx");
module.exports = function(description, data, res) {
	let workbook = XLSX.read(data),
		rows = [];
	workbook.SheetNames.forEach(function(sheetName) {
		rows = rows.concat(
			XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
		);
	});

	res.send(rows);
};

module.exports.id = /(xlsx|csv)/i;
