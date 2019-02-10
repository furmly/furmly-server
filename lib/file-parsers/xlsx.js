const XLSX = require("xlsx")
const debug = require("debug")("xlsx");

module.exports = function(description, data, res) {
	_parseOnly(description, data, function(er, rows) {
		if (er) return res.status(500), res.send(er);
		res.send(rows);
	});
};

module.exports.id = /(xlsx|csv)/i;

module.exports.parseOnly = _parseOnly;

module.exports.generate = toExcel;

function _parseOnly(description, data, fn) {
	try {
		let workbook = XLSX.read(data),
			rows = [];
		workbook.SheetNames.forEach(function(sheetName) {
			// added by harrison for camel casing =====================
			debug(`the sheet name is ${sheetName}`);
			debug("the current sheet is ");
			let sheet = workbook.Sheets[sheetName];
			debug(sheet);
			let headers = Object.keys(sheet);
			for (let i = 0; i < headers.length; i++) {
				if (headers[i].endsWith("1")) {
					debug("found a header ending with 1 " + headers[i]);
					for (let key in sheet[headers[i]]) {
						debug("found a key in the header " + key);
						if (sheet[headers[i]].hasOwnProperty(key)) {
							sheet[headers[i]][key] = sheet[headers[i]][
								key
							].toCamelCase();
						}
					}
				}
				if (headers[i].endsWith("2")) {
					//assuming that the object is sorted according to keys
					break;
				}
			}
			rows = rows.concat(XLSX.utils.sheet_to_json(sheet));
			debug("the current state for the rows is");
			debug(rows);
            //========================================================
			// rows = rows.concat(
			// 	XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
			// );
		});
		return fn(null, rows);
	} catch (e) {
		fn(e);
	}
}

function values(x) {
	return Object.keys(x).map(v => x[v]);
}

function toExcel(fileType, { sheetName, arr }, fn) {
	let _values = arr.map(x => values(x));
	_values.unshift(Object.keys(arr[0]));

	let ws = sheet_from_array_of_arrays(_values),
		wb = new Workbook();

	//debug(ws);
	/* add worksheet to workbook */
	wb.SheetNames.push(sheetName);
	wb.Sheets[sheetName] = ws;
	var wbout = XLSX.write(wb, {
		bookType: "xlsx",
		// bookSST: true,
		type: "buffer"
	});

	return setImmediate(fn, null, wbout, fileType);
}
function Workbook() {
	if (!(this instanceof Workbook)) return new Workbook();
	this.SheetNames = [];
	this.Sheets = {};
}

function sheet_from_array_of_arrays(data, opts) {
	debug(data);
	var ws = {};
	var range = { s: { c: 10000000, r: 10000000 }, e: { c: 0, r: 0 } };
	for (var R = 0; R != data.length; ++R) {
		for (var C = 0; C != data[R].length; ++C) {
			if (range.s.r > R) range.s.r = R;
			if (range.s.c > C) range.s.c = C;
			if (range.e.r < R) range.e.r = R;
			if (range.e.c < C) range.e.c = C;
			var cell = { v: data[R][C] };
			if (cell.v == null) continue;
			var cell_ref = XLSX.utils.encode_cell({ c: C, r: R });

			if (typeof cell.v === "number") cell.t = "n";
			else if (typeof cell.v === "boolean") cell.t = "b";
			else if (cell.v instanceof Date) {
				cell.t = "n";
				cell.z = XLSX.SSF._table[14];
				cell.v = datenum(cell.v);
			} else cell.t = "s";

			ws[cell_ref] = cell;
		}
	}
	if (range.s.c < 10000000) ws["!ref"] = XLSX.utils.encode_range(range);
	return ws;
}

function datenum(v, date1904) {
	if (date1904) v += 1462;
	var epoch = Date.parse(v);
	return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
}
