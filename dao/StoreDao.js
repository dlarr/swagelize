const models = require('../models');exports.getInventory = function() {
	return models.<<INSERT MODEL>>.<<INSERT METHOD>>({
		//attribute1: valueAttribute1,
		//attribute2: valueAttribute2,
	});
}

exports.placeOrder = function(body) {
	return models.<<INSERT MODEL>>.create({
		//attribute1: valueAttribute1,
		//attribute2: valueAttribute2,
	});
}

exports.getOrderById = function(orderId) {
	return models.Order.find({
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

exports.deleteOrder = function(orderId) {
	return models.<<INSERT MODEL>>.destroy({
		//attribute1: valueAttribute1,
		//attribute2: valueAttribute2,
	});
}

