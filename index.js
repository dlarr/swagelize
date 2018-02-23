const fs = require('fs');
var util = require('util');

/**
 * @namespace
 * @property {object} Sequelize
 * @property {function} Sequelize.BLOB
 * @property {function} Sequelize.ENUM
 * @property {function} Sequelize.STRING
 * @property {function} Sequelize.STRING.BINARY
 * @property {function} Sequelize.DATE
 * @property {function} Sequelize.ARRAY
 * @property {function} Sequelize.BOOLEAN
 * @property {function} Sequelize.DOUBLE
 * @property {function} Sequelize.FLOAT
 * @property {function} Sequelize.INTEGER
 * @property {function} Sequelize.BIGINT
 */
var Sequelize = require('sequelize');

var dialect = 'mysql';
/**
 * @param {string} newDialect
 * @returns {*}
 */
function setDialect(newDialect) {
	if (['mysql', 'mariadb', 'sqlite', 'postgres', 'mssql'].indexOf(newDialect) === -1) {
		throw new Error('Unknown sequalize dialect');
	}
	dialect = newDialect;
}

/**
 *
 * @param {Object|string} swaggerPropertySchema
 * @param {Object} swaggerPropertySchema.properties
 * @param {Object} swaggerPropertySchema.$ref
 * @param {Array} swaggerPropertySchema.enum
 * @param {string} swaggerPropertySchema.type
 * @param {string} swaggerPropertySchema.format
 * @param {Object|string} swaggerPropertySchema.items
 * @returns {*}
 */
function getSequalizeType(swaggerPropertySchema) {
	if (typeof swaggerPropertySchema === 'string') {
		swaggerPropertySchema = {
			type: swaggerPropertySchema
		}
	}

	if (swaggerPropertySchema.properties) {
		console.log('Warning: encountered', JSON.stringify(swaggerPropertySchema.properties));
		console.log('Cannot handle complex subschemas (yet?), falling back to blob');
		return Sequelize.BLOB;
	}

	if (swaggerPropertySchema.$ref) {
		console.log('Warning: encountered', JSON.stringify(swaggerPropertySchema.$ref));
		console.log('Cannot handle $ref (yet?), falling back to blob');
		return Sequelize.BLOB;
	}

	if (swaggerPropertySchema.enum) {
		return Sequelize.ENUM.apply(null, swaggerPropertySchema.enum);
	}

	// as seen http://swagger.io/specification/#dataTypeType
	switch (swaggerPropertySchema.type) {
		case 'string':
			switch (swaggerPropertySchema.format || "") {
				case 'byte':
				case 'binary':
					if (swaggerPropertySchema.maxLength > 5592415) {
						return Sequelize.BLOB('long');
					}

					if (swaggerPropertySchema.maxLength > 21845) {
						return Sequelize.BLOB('medium');
					}

					// NOTE: VARCHAR(255) may container 255 multibyte chars: it's _NOT_ byte delimited
					if (swaggerPropertySchema.maxLength > 255) {
						return Sequelize.BLOB();
					}
					return Sequelize.STRING.BINARY;

				case 'date':
					return Sequelize.DATEONLY;

				case 'date-time':
					//return Sequelize.DATETIME; //not working?
					return Sequelize.DATE;

				default:
					if (swaggerPropertySchema.maxLength) {
						// http://stackoverflow.com/questions/13932750/tinytext-text-mediumtext-and-longtext-maximum-sto
						// http://stackoverflow.com/questions/7755629/varchar255-vs-tinytext-tinyblob-and-varchar65535-v
						// NOTE: text may be in multibyte format!
						if (swaggerPropertySchema.maxLength > 5592415) {
							return Sequelize.TEXT('long');
						}

						if (swaggerPropertySchema.maxLength > 21845) {
							return Sequelize.TEXT('medium');
						}

						// NOTE: VARCHAR(255) may container 255 multibyte chars: it's _NOT_ byte delimited
						if (swaggerPropertySchema.maxLength > 255) {
							return Sequelize.TEXT();
						}
					}

					return Sequelize.STRING; // === VARCHAR
			}

		case 'array':
			if (dialect === 'postgres') {
				return Sequelize.ARRAY(getSequalizeType(swaggerPropertySchema.items));
			}
			console.log('Warning: encountered', JSON.stringify(swaggerPropertySchema));
			console.log('Can only handle array for postgres (yet?), see http://docs.sequelizejs.com/en/latest/api/datatypes/#array, falling back to blob');
			return Sequelize.BLOB;

		case 'boolean':
			return Sequelize.BOOLEAN;

		case 'integer':
			switch (swaggerPropertySchema.format || "") {
				case 'int32':
					if (typeof swaggerPropertySchema.minimum === "number" && swaggerPropertySchema.minimum >= 0) {
						return Sequelize.INTEGER.UNSIGNED;
					}
					return Sequelize.INTEGER;

				default:
					if (typeof swaggerPropertySchema.minimum === "number" && swaggerPropertySchema.minimum >= 0) {
						return Sequelize.BIGINT.UNSIGNED;
					}
					return Sequelize.BIGINT;
			}

		case 'number':
			switch (swaggerPropertySchema.format || "") {
				case 'float':
					return Sequelize.FLOAT;

				default:
					return Sequelize.DOUBLE;
			}

		default:
			console.log('Warning: encountered', JSON.stringify(swaggerPropertySchema));
			console.log('Unknown data type, falling back to blob');
			return Sequelize.BLOB;
	}
}

/**
 * This function returns the Sequelize type of the swagger property schema
 * Because of natural behaviour of util.inspect function used to stringify the property we need to use tokens
 * that will be removed afterward
 * @param swaggerPropertySchema
 * @returns {*}
 */
function getSequalizeTypeString(swaggerPropertySchema, logThis) {
    if (typeof swaggerPropertySchema === 'string') {
        swaggerPropertySchema = {
            type: swaggerPropertySchema
        }
    }

    if (swaggerPropertySchema.properties) {
        console.log('Warning: encountered', JSON.stringify(swaggerPropertySchema.properties));
        console.log('Cannot handle complex subschemas (yet?), falling back to blob');
        return '##DataTypes.BLOB##';
    }

    if (swaggerPropertySchema.$ref) {
        console.log('Warning: encountered', JSON.stringify(swaggerPropertySchema.$ref));
        console.log('$ref means its a foreign key, it will be handle separatly');
        console.log('Falling back to blob for now, whole property will be replaced in a method later');
        return '##DataTypes.BLOB##';
    }

    if (swaggerPropertySchema.enum) {
        let result = "";
        for (let i = 0; i < swaggerPropertySchema.enum.length; i++){
            result += "'" + swaggerPropertySchema.enum[i] + "', ";
        }
        result = result.substring(0, result.length - 2);
        return '##DataTypes.ENUM(' + result + ')##';
    }

    // as seen http://swagger.io/specification/#dataTypeType
    if (logThis){
        console.log('swaggerPropertySchema => ', swaggerPropertySchema);
    }
    switch (swaggerPropertySchema.type) {
        case 'string':
            switch (swaggerPropertySchema.format || "") {
                case 'byte':
                case 'binary':
                    if (swaggerPropertySchema.maxLength > 5592415) {
                        return '##DataTypes.BLOB(\'long\')##';
                    }

                    if (swaggerPropertySchema.maxLength > 21845) {
                        return '##DataTypes.BLOB(\'medium\')##';
                    }

                    // NOTE: VARCHAR(255) may container 255 multibyte chars: it's _NOT_ byte delimited
                    if (swaggerPropertySchema.maxLength > 255) {
                        return '##DataTypes.BLOB##';
                    }
                    return '##DataTypes.STRING.BINARY##';

                case 'date':
                    return '##DataTypes.DATEONLY##';

                case 'date-time':
                    //return Sequelize.DATETIME; //not working?
                    return '##DataTypes.DATE##';

                default:
                    if (swaggerPropertySchema.maxLength) {
                        // http://stackoverflow.com/questions/13932750/tinytext-text-mediumtext-and-longtext-maximum-sto
                        // http://stackoverflow.com/questions/7755629/varchar255-vs-tinytext-tinyblob-and-varchar65535-v
                        // NOTE: text may be in multibyte format!
                        if (swaggerPropertySchema.maxLength > 5592415) {
                            return '##DataTypes.TEXT(\'long\')##';
                        }

                        if (swaggerPropertySchema.maxLength > 21845) {
                            return '##DataTypes.TEXT(\'medium\')##';
                        }

                        // NOTE: VARCHAR(255) may container 255 multibyte chars: it's _NOT_ byte delimited
                        if (swaggerPropertySchema.maxLength > 255) {
                            return '##DataTypes.TEXT##';
                        }
                    }

                    return '##DataTypes.STRING##'; // === VARCHAR
            }

        case 'array':
            if (dialect === 'postgres') {
                return Sequelize.ARRAY(getSequalizeType(swaggerPropertySchema.items));
            }

            console.log('Warning: encountered', JSON.stringify(swaggerPropertySchema));
            console.log('Arrays functionaly means its a 1-N relations, it will be handle separatly');
            console.log('Falling back to blob for now, whole property will be replaced in a method later');
            return '##DataTypes.ARRAY##';

        case 'boolean':
            return '##DataTypes.BOOLEAN##';

        case 'integer':
            switch (swaggerPropertySchema.format || "") {
                case 'int32':
                    if (typeof swaggerPropertySchema.minimum === "number" && swaggerPropertySchema.minimum >= 0) {
                        return '##DataTypes.INTEGER.UNSIGNED##';
                    }
                    return '##DataTypes.INTEGER##';

                default:
                    if (typeof swaggerPropertySchema.minimum === "number" && swaggerPropertySchema.minimum >= 0) {
                        return '##DataTypes.BIGINT.UNSIGNED##';
                    }
                    return '##DataTypes.BIGINT##';
            }

        case 'number':
            switch (swaggerPropertySchema.format || "") {
                case 'float':
                    return '##DataTypes.FLOAT##';

                default:
                    return '##DataTypes.DOUBLE##';
            }

        default:
            console.log('Warning: encountered', JSON.stringify(swaggerPropertySchema));
            console.log('Unknown data type, falling back to blob');
            return '##DataTypes.BLOB##';
    }
}

/**
 * Will generate folder structure needed for the generation
 */
function generateFolders() {
    return new Promise(function(resolve, reject){
		try {
			console.log('Creating models folder');
			fs.mkdirSync('./models');
		} catch (err) {
			console.log('models folder already exists');
		}

		try {
			console.log('Creating dao folder');
			fs.mkdirSync('./dao');
		} catch (err) {
			console.log('dao folder already exists');
		}
        resolve();
    });
}

/**
 * GenerateFile ASYNC
 * @param folderPath
 * @param fileName
 * @param stringContent
 * @returns {Promise}
 */
function generateFile(folderPath, fileName, stringContent) {
	return new Promise(function(resolve, reject){
		fs.writeFile(folderPath + '/' + fileName, stringContent, function(err) {
			if(err) {
				return console.log(err);
			}
			resolve();
		});
	});
}

/**
 * Syncrhone version of generate file
 * @param folderPath
 * @param fileName
 * @param stringContent
 */
function generateFileSync(folderPath, fileName, stringContent) {
    fs.writeFileSync(folderPath + '/' + fileName, stringContent);
}

/**
 * Delete specified file
 * @param folderPath
 * @param fileName
 * @returns {Promise}
 */
function deleteFile(folderPath, fileName) {
	return new Promise(function(resolve, reject){
        fs.unlink(folderPath + '/' + fileName,function(err){
            if(err) reject(err);
            resolve();
        });
    });
}

/**
 * Generate 1 model, from a swagger.json definition
 * const readFile = fs.readFileSync('./swagger/swagger.json', 'utf-8');
 * const swaggerSpec = JSON.parse(readFile);
 * const generated = swaggerSequelize.generate(swaggerSpec.definitions[propertyName]);
 * @param schema
 */
function generate (schema) {
	var result = JSON.parse(JSON.stringify(schema.properties));

	Object.keys(result).forEach((propertyName) => {
		var propertySchema = result[propertyName];

		// BEGIN: Promote Attribute to primaryKey with autoIncrement
		if(propertySchema['x-primary-key'] === true) {
			propertySchema.primaryKey = true;
			propertySchema.autoIncrement = true;
			propertySchema.allowNull = false;
		}
		// END: Promote Attribute to primaryKey with autoIncrement

		propertySchema.type = getSequalizeType(propertySchema);
		if (propertySchema.default) {
			propertySchema.defaultValue = propertySchema.default;
		}
	});

	return result;

}

function findPrimaryKey(theModelSchema){
    const parsed = JSON.parse(JSON.stringify(theModelSchema.properties));
    console.dir(parsed, false, 5, true);
    let fkPropertySchema = '';
    let fkName = '';
    Object.keys(parsed).forEach((propertyName) => {
        var propertySchema = parsed[propertyName];
        if(propertySchema['x-primary-key'] === true) {
            fkPropertySchema = propertyName;
            fkName = propertyName;
        }
    });
    if (fkPropertySchema !== ''){
        return {fkPropertySchema: parsed[fkPropertySchema], fkName: fkName};
    }else {
        throw new Error('No primary key referenced !!!');
    }
}

/**
 * Because of natural function in utils.inspect, We are forced to use some tokens to display what we want.
 * This methods removes the tokens
 * @param generated
 * @returns {string}
 */
function removeEscaped(generated){
    return util.inspect(generated,false, 5, false)
        .replace(/'##/g, '')
        .replace(/##'/g, '')
        .replace(/\\'/g, "'");
}

/**
 * generate the index.js for sequelize if and only if it doesn't exists
 */
function generateModelIndex() {
    let sequelizeModelContent = '\'use strict\';\n';
    sequelizeModelContent += '\n';
    sequelizeModelContent += 'const fs        = require(\'fs\');\n';
    sequelizeModelContent += 'const path      = require(\'path\');\n';
    sequelizeModelContent += 'const Sequelize = require(\'sequelize\');\n';
    sequelizeModelContent += 'const basename  = path.basename(__filename);\n';
    sequelizeModelContent += 'const env       = process.env.NODE_ENV || \'local\';\n';
    sequelizeModelContent += 'const config    = require(path.join(__dirname + \'/../config/config.js\'))[env];\n';
    sequelizeModelContent += '\n';
    sequelizeModelContent += 'const db        = {};\n';
    sequelizeModelContent += 'let sequelize = null;\n';
    sequelizeModelContent += 'if (config.use_env_constiable) {\n';
    sequelizeModelContent += '\tsequelize = new Sequelize(process.env[config.use_env_constiable], config);\n';
    sequelizeModelContent += '} else {\n';
    sequelizeModelContent += '\tsequelize = new Sequelize(config.database, config.username, config.password, {\n';
    sequelizeModelContent += '\t\thost: config.host,\n';
    sequelizeModelContent += '\t\tport: 3306,\n';
    sequelizeModelContent += '\t\tlogging: true,\n';
    sequelizeModelContent += '\t\tdialect: config.dialect,\n';
    sequelizeModelContent += '\t\tpool: {\n';
    sequelizeModelContent += '\t\t\tmaxConnections: 5,\n';
    sequelizeModelContent += '\t\t\tmaxIdleTime: 30\n';
    sequelizeModelContent += '\t\t}\n';
    sequelizeModelContent += '\t});\n';
    sequelizeModelContent += '\n';
    sequelizeModelContent += '\t/* UNCOMENT BELOW TO TEST DATABASE CONNEXION*/\n';
    sequelizeModelContent += '\t// sequelize.authenticate().then(function () {\n';
    sequelizeModelContent += '\t//     console.log("Connexion HAS WORKED! ");\n';
    sequelizeModelContent += '\t// }).catch(function (err) {\n';
    sequelizeModelContent += '\t//     console.log("Connexion FAILED ==> err : ", err);\n';
    sequelizeModelContent += '\t// }).done();\n';
    sequelizeModelContent += '\n';
    sequelizeModelContent += '}\n';
    sequelizeModelContent += '\n';
    sequelizeModelContent += 'fs\n';
    sequelizeModelContent += '\t.readdirSync(__dirname)\n';
    sequelizeModelContent += '\t.filter(file => {\n';
    sequelizeModelContent += '\t\treturn (file.indexOf(\'.\') !== 0) && (file !== basename) && (file.slice(-3) === \'.js\');\n';
    sequelizeModelContent += '\t})\n';
    sequelizeModelContent += '\t.forEach(file => {\n';
    sequelizeModelContent += '\t\tconst model = sequelize[\'import\'](path.join(__dirname, file));\n';
    sequelizeModelContent += '\t\tdb[model.name] = model;\n';
    sequelizeModelContent += '\t});\n';
    sequelizeModelContent += '\n';
    sequelizeModelContent += 'Object.keys(db).forEach(modelName => {\n';
    sequelizeModelContent += '\tif (db[modelName].associate) {\n';
    sequelizeModelContent += '\t\tdb[modelName].associate(db);\n';
    sequelizeModelContent += '\t}\n';
    sequelizeModelContent += '});\n';
    sequelizeModelContent += '\n';
    sequelizeModelContent += 'db.sequelize = sequelize;\n';
    sequelizeModelContent += 'db.Sequelize = Sequelize;\n';
    sequelizeModelContent += '\n';
    sequelizeModelContent += 'module.exports = db;\n';
    try {
        fs.writeFileSync('./models/index.js', sequelizeModelContent, { flag: 'wx' }, 'utf-8');
    } catch (err) {
        console.log('models/index.js already exists, NOT OVERRIDING');
    }

}

/**
 * Generate 1 model, from a PARSED swagger.json definition => supply JSON.parse(JSON.stringify(definition.properties))
 *
 * Returning a string containing Sequelize type
 *
 * associations will be populated by found associaitions
 *
 * example
 * const readFile = fs.readFileSync('./swagger/swagger.json', 'utf-8');
 * const swaggerSpec = JSON.parse(readFile);
 * const generated = swaggerSequelize.generate(swaggerSpec.definitions[propertyName]);
 * @param schema
 */
function generateOne (currentModel, currentModelSchema, allModelsSchema, associations) {
    // var result = JSON.parse(JSON.stringify(currentModelSchema.properties));
    var result = currentModelSchema;
    // console.log('result => ', result);
    const foreignKeys = [];
    Object.keys(result).forEach((propertyName) => {
        var propertySchema = result[propertyName];

        if (propertySchema.nullable){
            propertySchema.allowNull = propertySchema.nullable;
            delete propertySchema.nullable;
        } else {
            propertySchema.allowNull = true;
            delete propertySchema.nullable;
        }

        // BEGIN: Promote Attribute to primaryKey with autoIncrement
        if(propertySchema['x-primary-key'] === true) {
            propertySchema.primaryKey = true;
            if (propertySchema['type'] !== 'string'){
                propertySchema.autoIncrement = true;
            }
            propertySchema.allowNull = false;
            delete propertySchema['x-primary-key'];
        }
        // END: Promote Attribute to primaryKey with autoIncrement

		const seqType = getSequalizeTypeString(propertySchema);
        // console.log('================> seqType = ', seqType);
        propertySchema.type = seqType;
        // console.log('================> propertySchema.type = ', propertySchema.type);
        // console.log('================> propertySchema = ', propertySchema);
        if (propertySchema.enum){
            delete propertySchema.enum;
		}
        if (propertySchema.xml){
            delete propertySchema.xml;
        }
        if (propertySchema.$ref){
            const temp = propertySchema.$ref.split('/');
            const type = temp[temp.length -1];
            foreignKeys.push({propertyToRemove: propertyName, propertyType: type});
            console.dir(foreignKeys);
        }
        if (propertySchema.default) {
            propertySchema.defaultValue = propertySchema.default;
        }


    });

    // MANAGING FOREIGN KEYS FOR CURRENT MODEL
    if (foreignKeys.length > 0){
        for(let i = 0; i < foreignKeys.length; i++){

            const refRemove = foreignKeys[i].propertyToRemove;
            const typeToFind = foreignKeys[i].propertyType;
            delete result[refRemove];
            // const fk = 'id_' + refRemove;
            const pkForTypeToFind = findPrimaryKey(allModelsSchema[typeToFind]);

            // OUT OF DATE FOR SEQUELIZE, WE DON'T NEED THE FK DESCRIBED IN THE MODEL
            // result[fk] = {
            //     type: getSequalizeTypeString(pkForTypeToFind.fkPropertySchema),
            //     allowNull: false,
            //     references: {
            //         model:typeToFind,
            //         key:pkForTypeToFind.fkName
            //     }
            // }

            //flag this associaition for l8er
            associations[currentModel] = associations[currentModel] || [];
            associations[currentModel].push({
                referencedModel: typeToFind,
                fkUsed: pkForTypeToFind.fkName,
                nullable: true
            });
        }
    }

    return result;

}

function uncapitalize(text){
    return text.charAt(0).toLowerCase() + text.substr(1);
}

/**
 * Generate all sequelize models based on completeSwaggerSchema.definitions input
 * @param modelSchema
 */
function generateModels(modelSchema) {
    return new Promise(function(resolve, reject){

        // MANAGING ARRAY TYPES
        console.log('============= MANAGING ARRAYS IN DEFINITIONS =============');
        let modelSchemas = []; // {key : key, modelSchema : result}
        let arrays = []
        let associations = {};
        /** index = loop index / key = modelName / value = schema content of the modelName */
        for (const [index, [key, value]] of Object.entries(Object.entries(modelSchema))) {

            var result = JSON.parse(JSON.stringify(value.properties));
            // console.log('PROCESSING ' + key + ' - result : ', result);

            Object.keys(result).forEach((propertyName) => {
                var propertySchema = result[propertyName];

                if (propertySchema.type === 'array'){



                    let impactedType ='';
                    // Add property FK to this current model into the referenced item type
                    if (!propertySchema.items){
                        throw new Error('swagger definitions contains an array without items definitions : ' + key);
                    }
                    if (propertySchema.items.$ref){

                        const temp = propertySchema.items.$ref.split('/');
                        impactedType = temp[temp.length-1];
                        // console.log('Referenced ARRAY => ', impactedType + ' for ' + key);

                    } else if (propertySchema.items.type === 'string') {
                        console.log('Encountered an ARRAY of string, not processing')
                    } else {
                        console.log('Encountered an ARRAY with a type of = ' + propertySchema.items.type + ' for ' + key);
                        console.log('Not processing it...');
                    }

                    // Mark the property to be removed from model, and Model to be impacted
                    arrays.push({propertyToRemove: propertyName, impactedType: impactedType, toBeReferenced: key});

                }
            });

            if (arrays.length > 0){
                for(let i = 0; i < arrays.length; i++){
                    const refRemove = arrays[i].propertyToRemove;
                    // console.log('deleting Array propretie : ' + refRemove);
                    delete result[refRemove];
                }
            }

            const ms = {key: key, modSchema: result};
            modelSchemas.push(ms);

        }

        // IMPACTINC CHANGES DUE TO ARRAYS FOUND
        if (arrays.length > 0) {
            for (let i = 0; i < modelSchemas.length; i++) {
                const key = modelSchemas[i].key;
                const value = modelSchemas[i].modSchema;
                for (let i = 0; i < arrays.length; i++) {
                    const impactedType = arrays[i].impactedType;
                    const toBeReferenced = arrays[i].toBeReferenced;
                    if (key === impactedType) {
                        // Found model to be impacted by the array
                        if (impactedType !== '') {
                            const tbrSchema = modelSchema[toBeReferenced];
                            const pkForTypeToFind = findPrimaryKey(tbrSchema);
                            // value['id_' + uncapitalize(toBeReferenced)] = {
                            //     type: tbrSchema.properties[pkForTypeToFind.fkName].type,
                            //     references: {
                            //         model: toBeReferenced,
                            //         key: pkForTypeToFind.fkName
                            //     }
                            // }

                            associations[key] = associations[key] || [];
                            associations[key].push({
                                referencedModel: toBeReferenced,
                                fkUsed: pkForTypeToFind.fkName,
                                nullable: false
                            });

                        }
                    }


                }
            }
        }
        console.log('============= DONE MANAGING ARRAYS IN DEFINITIONS =============');

        // GENERATING MODELS

        // INITIALIZATION OF SEQUELIZE FILE WITH DEFINITION
        var modelContents = {};
        for(let i = 0; i < modelSchemas.length; i++){
            const key = modelSchemas[i].key;
            const value = modelSchemas[i].modSchema;
        // for (const [index, [key, value]] of Object.entries(Object.entries(modelSchema))) {

            let sequelizeModelContent = 'module.exports = function(sequelize, DataTypes) {\n';
            sequelizeModelContent += '\tvar ' + key +' = sequelize.define(\'' + key + '\', ';

            const generated = generateOne(key, value, modelSchema, associations);

            sequelizeModelContent += removeEscaped(generated);

            sequelizeModelContent += ', {';
            sequelizeModelContent += '\n\t\ttableName: \'' + key + '\',';
            sequelizeModelContent += '\n\t\ttimestamps: false';
            sequelizeModelContent += '\n\t});';
            sequelizeModelContent += '\n';
            modelContents[key] = modelContents[key] || {};
            modelContents[key] = {model: key, modelContent: sequelizeModelContent};
		}


		// Manage associations
        console.log('ASSOCIATIONS => ', associations);
        for(let i = 0; i < modelSchemas.length; i++) {
            const currentKey = modelSchemas[i].key;
            if (associations[currentKey]){
                console.log('Process associations for ', currentKey);
                for (const [index, [associationKey, associationValue]] of Object.entries(Object.entries(associations))) {
                    if (currentKey === associationKey){
                        for (let i = 0; i< associationValue.length; i++){
                            console.log('key = ', associationKey);
                            console.log('value = ', associationValue[i]);
                            const referencedModel = associationValue[i].referencedModel;

                            // PART 1 => ASSOCIATE IN MODEL REFERENCING
                            modelContents[currentKey].modelContent += '\n';
                            modelContents[currentKey].modelContent += '\t ' + associationKey + '.associate =  function (models) {\n';
                            modelContents[currentKey].modelContent += '\t\tmodels.' + associationKey + '.belongsTo(models.'+ referencedModel +', {\n';
                            modelContents[currentKey].modelContent += '\t\t\tonDelete:\'CASCADE\',\n'; // TODO > define proper onDelete, onUpdate strategy here
                            modelContents[currentKey].modelContent += '\t\t\tforeignKey: \'id_' + uncapitalize(referencedModel) + '\'\n';
                            // modelContents[currentKey].modelContent += '\t\t\tforeignKey: {\n';
                            // modelContents[currentKey].modelContent += '\t\t\t\tname: id_'+ uncapitalize(referencedModel) +',\n';
                            // modelContents[currentKey].modelContent += '\t\t\t\tallowNull: '+ associationValue[i].nullable +',\n';
                            // modelContents[currentKey].modelContent += '\t\t\t}\n';
                            modelContents[currentKey].modelContent += '\t\t});\n';
                            modelContents[currentKey].modelContent += '\t};\n';

                            // PART 2 => ASSOCIATE IN MODEL REFERENCED
                            modelContents[referencedModel].modelContent += '\n';
                            modelContents[referencedModel].modelContent += '\t ' + referencedModel + '.associate =  function (models) {\n';
                            modelContents[referencedModel].modelContent += '\t\tmodels.' + referencedModel + '.hasMany(models.'+ associationKey +', {foreignKey: \'id_'+ uncapitalize(referencedModel) + '\'});\n';
                            modelContents[referencedModel].modelContent += '\t};\n';
                        }
                    }
                }
            }

        }

        // Finish files
        for(let i = 0; i < modelSchemas.length; i++) {
            const currentKey = modelSchemas[i].key;

            // finishing Sequelize file
            modelContents[currentKey].modelContent += '\n\treturn ' + currentKey + ';';
            modelContents[currentKey].modelContent += '\n};';
        }

        for (const [index, [key, value]] of Object.entries(Object.entries(modelContents))) {
            generateFileSync('./models', value.model + '.js',  value.modelContent);
        }
        resolve();
    });
}

/**
 * Generate DAO layer from path & models
 * @param pathSchema
 */
function generateDaos(pathSchema) {
	console.log('TODO > generateDaos');
}


/**
 * Generate all sequelize models to folder models (+ index.js according to sequelize specs : https://github.com/sequelize/express-example)
 * Also generate a dao folders with daos and speccified method
 * @param completeSwaggerSchema = complete swagger schema, JSON format only
 */
function generateAll(completeSwaggerSchema) {
    generateFolders();
    generateModelIndex();
    generateModels(completeSwaggerSchema.definitions);
    generateDaos(completeSwaggerSchema.path);
}

module.exports = {
	setDialect, generate, generateOne, generateFile, generateFileSync, deleteFile, generateFolders, generateAll,
	generateModels, generateDaos, removeEscaped, generateModelIndex
};
