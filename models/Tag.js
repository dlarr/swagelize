module.exports = function(sequelize, DataTypes) {
	var Tag = sequelize.define('Tag', { id: 
   { type: DataTypes.BIGINT,
     format: 'int64',
     allowNull: false,
     primaryKey: true,
     autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: true } }, {
		tableName: 'Tag',
		timestamps: false
	});

	 Tag.associate =  function (models) {
		models.Tag.belongsToMany(models.Pet, {as: 'pets', through: 'PetTag', foreignKey: 'id_tag', otherKey: 'id_pet'});
	};

	return Tag;
};