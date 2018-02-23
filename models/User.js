module.exports = function(sequelize, DataTypes) {
	var User = sequelize.define('User', { id: 
   { type: DataTypes.BIGINT,
     format: 'int64',
     allowNull: false,
     primaryKey: true,
     autoIncrement: true },
  username: { type: DataTypes.STRING, allowNull: true },
  firstName: { type: DataTypes.STRING, allowNull: true },
  lastName: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true },
  password: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: true },
  userStatus: 
   { type: DataTypes.INTEGER,
     format: 'int32',
     description: 'User Status',
     allowNull: true } }, {
		tableName: 'User',
		timestamps: false
	});

	return User;
};