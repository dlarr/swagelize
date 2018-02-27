const models = require('../models');exports.addPet = function(body) {
	return models.Pet.create({
		//attribute1: valueAttribute1,
		//attribute2: valueAttribute2,
	});
}

exports.updatePet = function(body) {
	return models.Pet.update({
		//attribute1: valueAttribute1,
		//attribute2: valueAttribute2,
	});
}

exports.findPetsByStatus = function(status) {
	return models.Pet.findAll({
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

exports.findPetsByTags = function(tags) {
	return models.Pet.findAll({
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

exports.getPetById = function(petId) {
	return models.Pet.find({
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

exports.updatePetWithForm = function(petId, name, status) {
	return models.Pet.create({
		//attribute1: valueAttribute1,
		//attribute2: valueAttribute2,
	});
}

exports.deletePet = function(api_key, petId) {
	return models.Pet.destroy({
		//attribute1: valueAttribute1,
		//attribute2: valueAttribute2,
	});
}

exports.uploadFile = function(petId, additionalMetadata, file) {
	return models.Pet.create({
		//attribute1: valueAttribute1,
		//attribute2: valueAttribute2,
	});
}

