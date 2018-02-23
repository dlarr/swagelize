module.exports = function(sequelize, DataTypes) {
	var ApiResponse = sequelize.define('ApiResponse', { code: 
   { type: DataTypes.INTEGER,
     format: 'int32',
     allowNull: false,
     primaryKey: true,
     autoIncrement: true },
  type: { type: DataTypes.STRING, allowNull: true },
  message: { type: DataTypes.STRING, allowNull: true } }, {
		tableName: 'ApiResponse',
		timestamps: false
	});

	return ApiResponse;
};