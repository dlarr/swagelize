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
		models.Tag.belongsTo(models.Pet, {
			onDelete:'CASCADE',
			foreignKey: 'id_pet'
		});
	};

	return Tag;
};