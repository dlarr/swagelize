module.exports = function(sequelize, DataTypes) {
	var Pet = sequelize.define('Pet', { id: 
   { type: DataTypes.BIGINT,
     format: 'int64',
     allowNull: false,
     primaryKey: true,
     autoIncrement: true },
  name: 
   { type: DataTypes.STRING,
     example: 'doggie',
     allowNull: true },
  status: 
   { type: DataTypes.ENUM('available', 'pending', 'sold'),
     description: 'pet status in the store',
     allowNull: true } }, {
		tableName: 'Pet',
		timestamps: false
	});

	 Pet.associate =  function (models) {
		models.Pet.belongsToMany(models.Tag, {as: 'tags', through: 'PetTag', foreignKey: 'id_pet', otherKey: 'id_tag'});
	};

	 Pet.associate =  function (models) {
		models.Pet.belongsTo(models.Category, {
			onDelete:'CASCADE',
			foreignKey: 'id_category'
		});
	};

	return Pet;
};