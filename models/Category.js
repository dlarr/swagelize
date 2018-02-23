module.exports = function(sequelize, DataTypes) {
	var Category = sequelize.define('Category', { id: 
   { type: DataTypes.BIGINT,
     format: 'int64',
     allowNull: false,
     primaryKey: true,
     autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: true } }, {
		tableName: 'Category',
		timestamps: false
	});

	 Category.associate =  function (models) {
		models.Category.hasMany(models.Pet, {foreignKey: 'id_category'});
	};

	return Category;
};