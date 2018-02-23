"use strict";
process.env.DATABASE_URI = 'mysql://root:admin@127.0.0.1:3306/TEST_SWAGUELIZE';
if (!process.env.DATABASE_URI) {
	console.log('Please set the environment variable DATABASE_URI to test against');
	process.exit(1);
}

var swagelize = require('../index.js');
var fs = require('fs');
var util = require('util');
var Sequelize = require('sequelize');

var Promise = require('bluebird');

var sequelize = new Sequelize(process.env.DATABASE_URI);
var swaggerSpec = JSON.parse(fs.readFileSync(__dirname + '/fixtures/swagger2.json', 'utf-8'));

// exports.testGenerate = (test) => {
// 	let models = {};
//     swagelize.setDialect('mariadb');
// 	Object.keys(swaggerSpec.definitions).forEach((modelName) => {
// 		models[modelName] =  sequelize.define(modelName, swagelize.generate(swaggerSpec.definitions[modelName]), { freezeTableName: true });
// 	});
//
// 	let syncPromises = Object.keys(models).map((modelName) => {
// 		return models[modelName].sync({force: true});
// 	});
//
// 	Promise.all(syncPromises).then(() => {
// 		console.log('done?');
// 		test.done();
// 	}).catch(test.done);
// };


// exports.testSingleGenerate = (test) => {
//     swagelize.setDialect('mariadb');
//     const def = swaggerSpec.definitions['Pet'];
//     const generated = swagelize.generateOne(def, swaggerSpec.definitions);
//     swagelize.generateFileSync('.', 'testFile.js', 'var generated = ' + swagelize.removeEscaped(generated));
//     test.done();
// };

exports.testGenerateModels = (test) => {
    swagelize.setDialect('mariadb');
    swagelize.generateFolders().then(()=>{
        swagelize.generateModelIndex();
        swagelize.generateModels(swaggerSpec.definitions).then(() => {
            test.done();
        });
    });

};

// exports.sequelizeSync = (test) => {
//     var db = require('../models/index.js');
// };
