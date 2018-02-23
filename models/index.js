'use strict';

const fs        = require('fs');
const path      = require('path');
const Sequelize = require('sequelize');
const basename  = path.basename(__filename);
const env       = process.env.NODE_ENV || 'local';
const config    = require(path.join(__dirname + '/../config/config.js'))[env];

const db        = {};
let sequelize = null;
if (config.use_env_constiable) {
	sequelize = new Sequelize(process.env[config.use_env_constiable], config);
} else {
	sequelize = new Sequelize(config.database, config.username, config.password, {
		host: config.host,
		port: 3306,
		logging: true,
		dialect: config.dialect,
		pool: {
			maxConnections: 5,
			maxIdleTime: 30
		}
	});

	/* UNCOMENT BELOW TO TEST DATABASE CONNEXION*/
	// sequelize.authenticate().then(function () {
	//     console.log("Connexion HAS WORKED! ");
	// }).catch(function (err) {
	//     console.log("Connexion FAILED ==> err : ", err);
	// }).done();

}

fs
	.readdirSync(__dirname)
	.filter(file => {
		return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
	})
	.forEach(file => {
		const model = sequelize['import'](path.join(__dirname, file));
		db[model.name] = model;
	});

Object.keys(db).forEach(modelName => {
	if (db[modelName].associate) {
		db[modelName].associate(db);
	}
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.sequelize.sync({force:true});

module.exports = db;
