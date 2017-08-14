module.exports = function(description, data, res,req) {
	if(req && req.query && req.query.format =='base64'){
		res.send({uri:`data:${description.mime};base64,${data.toString('base64')}`});
		return;
	}
	res.append("Content-Type", description.mime);
	res.append("Content-Length", data.length);
	res.write(data);
	res.end();
};
module.exports.id = /(jpg|jpeg|png|giff|bmp)/i;
