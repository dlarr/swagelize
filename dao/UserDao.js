const models = require('../models');exports.createUser = function(body) {
	return models.User.create({
		//attribute1: valueAttribute1,
		//attribute2: valueAttribute2,
	});
}

exports.createUsersWithArrayInput = function(body) {
	return models.User.create({
		//attribute1: valueAttribute1,
		//attribute2: valueAttribute2,
	});
}

exports.createUsersWithListInput = function(body) {
	return models.User.create({
		//attribute1: valueAttribute1,
		//attribute2: valueAttribute2,
	});
}

exports.loginUser = function(username, password) {
	return models.User.<<INSERT METHOD>>({
		//attribute1: valueAttribute1,
		//attribute2: valueAttribute2,
	});
}

exports.logoutUser = function() {
	return models.User.find({
		include: [
			//{
				//model: models.<<MODEL TO BE INCLUDED>>,
				//attributes: {exclude: [<<ATTRIBUTES TO BE EXCLUDED>>]}
			//}
		],
		where: {
			//<<ATTRIBUTE>>: <<PARAM>>,
			//<<ANOTHER_ATTRIBUTE>>: <<ANOTHER_PARAM>>
		}
	});
}

exports.getUserByName = function(username) {
	return models.User.find({
		include: [
			//{
				//model: models.<<MODEL TO BE INCLUDED>>,
				//attributes: {exclude: [<<ATTRIBUTES TO BE EXCLUDED>>]}
			//}
		],
		where: {
			//<<ATTRIBUTE>>: <<PARAM>>,
			//<<ANOTHER_ATTRIBUTE>>: <<ANOTHER_PARAM>>
		}
	});
}

exports.updateUser = function(username, body) {
	return models.User.update({
		//attribute1: valueAttribute1,
		//attribute2: valueAttribute2,
	});
}

exports.deleteUser = function(username) {
	return models.User.destroy({
		//attribute1: valueAttribute1,
		//attribute2: valueAttribute2,
	});
}

