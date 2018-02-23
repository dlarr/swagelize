module.exports = function(sequelize, DataTypes) {
	var Order = sequelize.define('Order', { id: 
   { type: DataTypes.BIGINT,
     format: 'int64',
     allowNull: false,
     primaryKey: true,
     autoIncrement: true },
  petId: 
   { type: DataTypes.BIGINT,
     format: 'int64',
     allowNull: true },
  quantity: 
   { type: DataTypes.INTEGER,
     format: 'int32',
     allowNull: true },
  shipDate: 
   { type: DataTypes.DATE,
     format: 'date-time',
     allowNull: true },
  status: 
   { type: DataTypes.ENUM('placed', 'approved', 'delivered'),
     description: 'Order Status',
     allowNull: true },
  complete: 
   { type: DataTypes.BOOLEAN,
     default: false,
     allowNull: true } }, {
		tableName: 'Order',
		timestamps: false
	});

	return Order;
};