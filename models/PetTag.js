module.exports = function(sequelize, DataTypes) {
	var PetTag = sequelize.define('PetTag', { dateX: 
   { type: DataTypes.DATE,
     format: 'date-time',
     allowNull: true } }, {
		tableName: 'PetTag',
		timestamps: false
	});

	return PetTag;
};