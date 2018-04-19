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

function findPrimaryKey(theModel, theModelSchema){
    const parsed = JSON.parse(JSON.stringify(theModelSchema));
    if (!parsed['x-primary-key']){
        throw new Error('No primary key referenced for model ' + theModel + ' !!!');
    }

    return {pks: parsed['x-primary-key']};
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
        .replace(/\\'/g, "'")
        .replace(/\\\\'/g, "\\'");
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
    sequelizeModelContent += '\t\tport: config.dbPort,\n';
    sequelizeModelContent += '\t\tlogging: config.logging,\n';
    sequelizeModelContent += '\t\tdialect: config.dialect,\n';
    sequelizeModelContent += '\t\tpool: {\n';
    sequelizeModelContent += '\t\t\tmaxConnections: config.maxConnections,\n';
    sequelizeModelContent += '\t\t\tmaxIdleTime: config.maxIdleTime\n';
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
    var result = currentModelSchema;
    // console.log('result => ', result);
    const foreignKeys = [];
    const throughTable = allModelsSchema[currentModel].throughTable;
    Object.keys(result).forEach((propertyName) => { // for each property in model shcema
        var propertySchema = result[propertyName];

        if (propertySchema.nullable){
            propertySchema.allowNull = propertySchema.nullable;
            delete propertySchema.nullable;
        } else {
            propertySchema.allowNull = true;
            delete propertySchema.nullable;
        }

        // If current propertyName is contained withing PKS, promote it to primaryKey (supporting multiple PKS)
        const pkeys = allModelsSchema[currentModel]['x-primary-key'];
        if (pkeys){
            for (let i = 0; i < pkeys.length; i++){
                if (propertyName ===  pkeys[i]) {
                    propertySchema.primaryKey = true;
                    propertySchema.allowNull = false;
                    if (propertySchema['type'] !== 'string' && pkeys.length == 1){
                        propertySchema.autoIncrement = true;
                    }
                }
            }
        }

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
            const throughTable = propertySchema.throughTable;
            const nullable = propertySchema.nullable;
            const sourceCardinality = propertySchema.sourceCardinality;
            const useThroughTableFields = propertySchema.useThroughTableFields;
            foreignKeys.push({
                propertyToRemove: propertyName,
                propertyType: type,
                throughTable: throughTable,
                useThroughTableFields:useThroughTableFields,
                sourceCardinality: sourceCardinality,
                nullable: nullable
            });
            console.dir(foreignKeys);
        }
        if (propertySchema.default) {
            propertySchema.defaultValue = propertySchema.default;
        }


    });

    // MANAGING FOREIGN KEYS FOR CURRENT MODEL

    if (foreignKeys.length > 0){
        for(let i = 0; i < foreignKeys.length; i++){

            const sourceAttributeName = foreignKeys[i].propertyToRemove;
            const typeToFind = foreignKeys[i].propertyType;
            delete result[sourceAttributeName];
            if (!throughTable){
                const pkForTypeToFind = findPrimaryKey(typeToFind, allModelsSchema[typeToFind]);

                //flag this association to process l8er
                associations[currentModel] = associations[currentModel] || [];
                associations[currentModel].push({
                    referencedModel: typeToFind,
                    fksUsed: pkForTypeToFind.pks,
                    throughTable: foreignKeys[i].throughTable,
                    useThroughTableFields: foreignKeys[i].useThroughTableFields,
                    sourceCardinality: foreignKeys[i].sourceCardinality,
                    targetCardinality: foreignKeys[i].throughTable? 'N' : '1',
                    sourceAttributeName: sourceAttributeName,
                    nullable: foreignKeys[i].nullable
                });
            }
        }
    }


    return result;

}

function uncapitalize(text){
    return text.charAt(0).toLowerCase() + text.substr(1);
}
function capitalize(text){
    return text.charAt(0).toUpperCase() + text.substr(1);
}

/**
 * Generate all sequelize models based on completeSwaggerSchema.definitions input
 * @param modelSchema
 */
function generateModels(modelSchema) {
    return new Promise(function(resolve, reject){

        // MANAGING ARRAY TYPES
        console.log('============= MANAGING ARRAYS IN DEFINITIONS =============');
        let modelSchemas = [];
        let arrays = []
        let associations = {};
        /** index = loop index / key = modelName / value = schema content of the modelName */
        for (const [index, [key, value]] of Object.entries(Object.entries(modelSchema))) { // for each entry in swagger spec definitions node

            var result = JSON.parse(JSON.stringify(value.properties));
            // console.log('PROCESSING ' + key + ' - result : ', result);

            Object.keys(result).forEach((propertyName) => { // for each entry in the Object
                var propertySchema = result[propertyName];

                if (propertySchema.type === 'array'){

                    let impactedType ='';
                    let throughTable ='';
                    // Add property FK to this current model into the referenced item type
                    if (!propertySchema.items){
                        throw new Error('swagger definitions contains an array without items definitions : ' + key);
                    }
                    if (propertySchema.items.$ref){

                        const temp = propertySchema.items.$ref.split('/');
                        impactedType = temp[temp.length-1];
                        throughTable = propertySchema.throughTable;
                        useThroughTableFields = propertySchema.useThroughTableFields;
                        console.log('Referenced ARRAY => ', impactedType + ' for ' + key + ' throughTable = ' + throughTable);

                    } else if (propertySchema.items.type === 'string') {
                        console.log('Encountered an ARRAY of string, not processing')
                    } else {
                        console.log('Encountered an ARRAY with a type of = ' + propertySchema.items.type + ' for ' + key);
                        console.log('Not processing it...');
                    }

                    // Mark the property to be removed from model, and Model to be impacted
                    arrays.push({
                        propertyToRemove: propertyName,
                        impactedType: impactedType,
                        toBeReferenced: key,
                        throughTable: throughTable
                    });

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
            for (let i = 0; i < modelSchemas.length; i++) { // for each model
                const key = modelSchemas[i].key;
                const value = modelSchemas[i].modSchema;
                for (let i = 0; i < arrays.length; i++) { // for each referenced impacted type in the array
                    const impactedType = arrays[i].impactedType;
                    const toBeReferenced = arrays[i].toBeReferenced;
                    const throughTable = arrays[i].throughTable;
                    const sourceAttributeName = arrays[i].propertyToRemove;
                    if (key === impactedType) { // if current model == impactedType in the array
                        // Found model to be impacted by the array
                        if (impactedType !== '') {
                            const tbrSchema = modelSchema[toBeReferenced];
                            const pkForTypeToFind = findPrimaryKey(toBeReferenced, tbrSchema);

                            associations[key] = associations[key] || [];
                            associations[key].push({
                                referencedModel: toBeReferenced,
                                sourceCardinality: 'N',                         // This says toBeReferenced has N key (for arrays N is always the case)
                                targetCardinality: throughTable? 'N' : '1',     // This says if throughTable specified, its [Key]N---N[ToBeReferenced], else [Key]N---1[ToBeReferenced]
                                sourceAttributeName: sourceAttributeName,
                                fkUsed: pkForTypeToFind.pks,
                                throughTable: throughTable,
                                nullable: true
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
            console.log('generated =>', generated);

            sequelizeModelContent += removeEscaped(generated);
            console.log('sequelizeModelContent =>', sequelizeModelContent);

            sequelizeModelContent += ', {';
            sequelizeModelContent += '\n\t\ttableName: \'' + key + '\',';
            sequelizeModelContent += '\n\t\ttimestamps: false';
            sequelizeModelContent += '\n\t});';
            sequelizeModelContent += '\n';
            modelContents[key] = modelContents[key] || {};
            modelContents[key] = {model: key, modelContent: sequelizeModelContent};
		}


		// Manage associations
        console.log('ASSOCIATIONS DETAILS =====>');
        console.dir(associations, {depth:null, colors:true});

        console.log('MANANING FIRST LINE OF ASSOCIATION IN EVERY MODELS : Model.associate = function (models)');
        var modelFirstLineDone = {};
        for (const [index, [associationKey, associationValue]] of Object.entries(Object.entries(associations))) {
            modelContents[associationKey].modelContent += '\n\t ' + associationKey + '.associate =  function (models) {\n';
            modelFirstLineDone[associationKey] = modelFirstLineDone[associationKey] || {};
            modelFirstLineDone[associationKey] = {model: associationKey, done: true};
            for (let i = 0; i < associationValue.length; i++){
                modelFirstLineDone[associationValue[i].referencedModel] = modelFirstLineDone[associationValue[i].referencedModel] || {};
                if (!(modelFirstLineDone[associationValue[i].referencedModel].done)){
                    modelContents[associationValue[i].referencedModel].modelContent += '\n\t ' + associationValue[i].referencedModel + '.associate =  function (models) {\n';
                    modelFirstLineDone[associationValue[i].referencedModel] = {model: associationValue[i].referencedModel, done: true};
                }

            }
        }

        for(let i = 0; i < modelSchemas.length; i++) {
            const currentKey = modelSchemas[i].key;
            if (associations[currentKey]){
                console.log('Managing associations for ' + currentKey);
                for (const [index, [associationKey, associationValue]] of Object.entries(Object.entries(associations))) {
                    if (currentKey === associationKey){
                        for (let i = 0; i< associationValue.length; i++){
                            // console.log('key = ', associationKey);
                            // console.log('value = ', associationValue[i]);
                            // console.log('throughTable = ', associationValue[i].throughTable);
                            const referencedModel = associationValue[i].referencedModel;
                            const throughTable = associationValue[i].throughTable;
                            const sourceCardinality = associationValue[i].sourceCardinality;
                            const targetCardinality = associationValue[i].targetCardinality;
                            const sourceAttributeName = associationValue[i].sourceAttributeName;

                            let throughTableStringValue = '';
                            if(throughTable){
                                throughTableStringValue = '\'' + throughTable + '\',';
                                if (modelContents[throughTable]) {
                                    throughTableStringValue = '{model:models.' + throughTable;
                                    console.log('modelSchema[throughTable] => ', modelSchema[throughTable]);
                                    if (modelSchema[throughTable].uniqueFks){
                                        throughTableStringValue += '},'
                                    } else {
                                        throughTableStringValue += ', unique:false},'
                                    }
                                }
                            }

                            // If cardinality is definined, it can only be 1 or N
                            if (sourceCardinality && (sourceCardinality !== '1' && sourceCardinality !== 'N')){
                                throw new Error('Cardinality can only be 1 or N, encountered ' + sourceCardinality + ' for model ' + associationKey);
                            }

                            // PART 1 => ASSOCIATE IN MODEL REFERENCING
                            // if (throughTable){ // N-N associations
                            console.log('\t[' + associationKey + ']' + sourceCardinality + '---' + targetCardinality + '[' + referencedModel + ']');
                            console.log('\tManaging into ' + associationKey + ' model');
                            if (sourceCardinality === 'N' && targetCardinality === 'N') {
                                if (associationKey === referencedModel) { // Recursive relation
                                    modelContents[associationKey].modelContent += '\n';

                                    modelContents[associationKey].modelContent += '\t\tmodels.' + associationKey +
                                        '.belongsToMany(models.'+ referencedModel +', {as: \'' + uncapitalize(referencedModel) + 's' + 'Source\',' +
                                        'through :' + throughTableStringValue +
                                        'foreignKey: \'id_' + uncapitalize(associationKey) + 'Source\',' +
                                        'otherKey: \'id_' + uncapitalize(referencedModel) + 'Target\'});\n';

                                } else {
                                    modelContents[associationKey].modelContent += '\n';
                                    // modelContents[associationKey].modelContent += '\t ' + associationKey + '.associate =  function (models) {\n';
                                    modelContents[associationKey].modelContent += '\t\tmodels.' + associationKey +
                                        '.belongsToMany(models.'+ referencedModel +', {as: \'' + sourceAttributeName + '\',' +
                                        'through : ' + throughTableStringValue +
                                        'foreignKey: \'id_' + uncapitalize(associationKey) + '\',' +
                                        'otherKey: \'id_' + uncapitalize(referencedModel) + '\'});\n';
                                    // modelContents[associationKey].modelContent += '\t};\n';
                                }

                            } else if (sourceCardinality === 'N' && targetCardinality === '1') {
                                if (associationKey === referencedModel) { // Recursive relation
                                    modelContents[associationKey].modelContent += '\n';
                                    // modelContents[associationKey].modelContent += '\t ' + associationKey + '.associate =  function (models) {\n';
                                    modelContents[associationKey].modelContent += '\t\tmodels.' + associationKey + '.belongsTo(models.'+ referencedModel +', {\n';
                                    modelContents[associationKey].modelContent += '\t\t\tonDelete:\'CASCADE\',\n'; // TODO > define proper onDelete, onUpdate strategy here
                                    modelContents[associationKey].modelContent += '\t\t\tforeignKey: \'id_' + uncapitalize(referencedModel) + '_parent\'\n';
                                    modelContents[associationKey].modelContent += '\t\t});\n';
                                    // modelContents[associationKey].modelContent += '\t};\n';
                                } else {
                                    modelContents[associationKey].modelContent += '\n';
                                    // modelContents[associationKey].modelContent += '\t ' + associationKey + '.associate =  function (models) {\n';
                                    modelContents[associationKey].modelContent += '\t\tmodels.' + associationKey + '.belongsTo(models.'+ referencedModel +', {\n';
                                    modelContents[associationKey].modelContent += '\t\t\tonDelete:\'CASCADE\',\n'; // TODO > define proper onDelete, onUpdate strategy here
                                    modelContents[associationKey].modelContent += '\t\t\tforeignKey: \'id_' + uncapitalize(referencedModel) + '\'\n';
                                    modelContents[associationKey].modelContent += '\t\t});\n';
                                    // modelContents[associationKey].modelContent += '\t};\n';
                                }

                            } else if (sourceCardinality === '1' && targetCardinality === 'N') {
                                if (associationKey === referencedModel) { // Recursive relation
                                    modelContents[associationKey].modelContent += '\n';
                                    // modelContents[associationKey].modelContent += '\t ' + associationKey + '.associate =  function (models) {\n';
                                    modelContents[associationKey].modelContent += '\t\tmodels.' + associationKey + '.belongsTo(models.'+ referencedModel +', {\n';
                                    modelContents[associationKey].modelContent += '\t\t\tonDelete:\'CASCADE\',\n'; // TODO > define proper onDelete, onUpdate strategy here
                                    modelContents[associationKey].modelContent += '\t\t\tforeignKey: \'id_' + uncapitalize(referencedModel) + '_parent\'\n';
                                    modelContents[associationKey].modelContent += '\t\t});\n';
                                    // modelContents[associationKey].modelContent += '\t};\n';
                                } else {
                                    modelContents[associationKey].modelContent += '\n';
                                    // modelContents[associationKey].modelContent += '\t ' + associationKey + '.associate =  function (models) {\n';
                                    modelContents[associationKey].modelContent += '\t\tmodels.' + associationKey + '.belongsTo(models.'+ referencedModel +', {\n';
                                    modelContents[associationKey].modelContent += '\t\t\tonDelete:\'CASCADE\',\n'; // TODO > define proper onDelete, onUpdate strategy here
                                    modelContents[associationKey].modelContent += '\t\t\tforeignKey: \'id_' + uncapitalize(referencedModel) + '\'\n';
                                    modelContents[associationKey].modelContent += '\t\t});\n';
                                    // modelContents[associationKey].modelContent += '\t};\n';
                                }

                            } else if (sourceCardinality === '1' && targetCardinality === '1') {
                                if (associationKey === referencedModel) { // Recursive relation
                                    modelContents[associationKey].modelContent += '\n';
                                    // modelContents[associationKey].modelContent += '\t ' + associationKey + '.associate =  function (models) {\n';
                                    modelContents[associationKey].modelContent += '\t\tmodels.' + associationKey + '.belongsTo(models.'+ referencedModel +', {\n';
                                    modelContents[associationKey].modelContent += '\t\t\tonDelete:\'CASCADE\',\n'; // TODO > define proper onDelete, onUpdate strategy here
                                    modelContents[associationKey].modelContent += '\t\t\tforeignKey: \'id_' + uncapitalize(referencedModel) + '_parent\'\n';
                                    modelContents[associationKey].modelContent += '\t\t});\n';
                                    // modelContents[associationKey].modelContent += '\t};\n';
                                } else {
                                    modelContents[associationKey].modelContent += '\n';
                                    // modelContents[associationKey].modelContent += '\t ' + associationKey + '.associate =  function (models) {\n';
                                    modelContents[associationKey].modelContent += '\t\tmodels.' + associationKey + '.belongsTo(models.'+ referencedModel +', {\n';
                                    modelContents[associationKey].modelContent += '\t\t\tonDelete:\'CASCADE\',\n'; // TODO > define proper onDelete, onUpdate strategy here
                                    modelContents[associationKey].modelContent += '\t\t\tforeignKey: \'id_' + sourceAttributeName + '\'\n';
                                    modelContents[associationKey].modelContent += '\t\t});\n';
                                    // modelContents[associationKey].modelContent += '\t};\n';
                                }

                            } else {
                                throw new Error ('There is a problem with cardinalities');
                            }


                            // PART 2 => ASSOCIATE IN MODEL REFERENCED
                            console.log('\tManaging into ' + referencedModel + ' model');
                            if (sourceCardinality === 'N' && targetCardinality === 'N') {
                                if (associationKey === referencedModel) { // Recursive relation
                                    modelContents[referencedModel].modelContent += '\n';
                                    // modelContents[referencedModel].modelContent += '\t ' + referencedModel + '.associate =  function (models) {\n';
                                    modelContents[referencedModel].modelContent += '\t\tmodels.' + referencedModel +
                                        '.belongsToMany(models.'+ associationKey +', {as: \'' + uncapitalize(associationKey) + 's' + 'Target\',' +
                                        'through: ' + throughTableStringValue +
                                        'foreignKey: \'id_' + uncapitalize(referencedModel) + 'Target\',' +
                                        'otherKey: \'id_' + uncapitalize(associationKey) + 'Source\'});\n';
                                    // modelContents[referencedModel].modelContent += '\t};\n';
                                } else {
                                    modelContents[referencedModel].modelContent += '\n';
                                    // modelContents[referencedModel].modelContent += '\t ' + referencedModel + '.associate =  function (models) {\n';
                                    modelContents[referencedModel].modelContent += '\t\tmodels.' + referencedModel +
                                        '.belongsToMany(models.'+ associationKey +', {as: \'' + uncapitalize(associationKey) + 's\',' +
                                        'through: ' + throughTableStringValue +
                                        'foreignKey: \'id_' + uncapitalize(referencedModel) + '\',' +
                                        'otherKey: \'id_' + uncapitalize(associationKey) + '\'});\n';
                                    // modelContents[referencedModel].modelContent += '\t};\n';
                                }

                            } else if (sourceCardinality === 'N' && targetCardinality === '1') {
                                if (associationKey === referencedModel) { // Recursive relation
                                    modelContents[referencedModel].modelContent += '\n';
                                    // modelContents[referencedModel].modelContent += '\t ' + referencedModel + '.associate =  function (models) {\n';
                                    modelContents[referencedModel].modelContent += '\t\tmodels.' + referencedModel + '.hasMany(models.'+
                                        associationKey +', {foreignKey: \'id_'+ uncapitalize(referencedModel) + '_parent\'});\n';
                                    // modelContents[referencedModel].modelContent += '\t};\n';
                                } else {
                                    modelContents[referencedModel].modelContent += '\n';
                                    // modelContents[referencedModel].modelContent += '\t ' + referencedModel + '.associate =  function (models) {\n';
                                    modelContents[referencedModel].modelContent += '\t\tmodels.' + referencedModel + '.hasMany(models.'+ associationKey +
                                        ', {as: \'' + sourceAttributeName + '\', foreignKey: \'id_'+ uncapitalize(referencedModel) + '\', onDelete:\'CASCADE\'});\n';
                                    // modelContents[referencedModel].modelContent += '\t};\n';
                                }

                            } else if (sourceCardinality === '1' && targetCardinality === 'N') {
                                if (associationKey === referencedModel) { // Recursive relation
                                    modelContents[referencedModel].modelContent += '\n';
                                    // modelContents[referencedModel].modelContent += '\t ' + referencedModel + '.associate =  function (models) {\n';
                                    modelContents[referencedModel].modelContent += '\t\tmodels.' + referencedModel + '.hasOne(models.'+ associationKey +
                                        ', {foreignKey: \'id_'+ uncapitalize(referencedModel) + '_parent\'});\n';
                                    modelContents[referencedModel].modelContent += '\t};\n';
                                } else {
                                    modelContents[referencedModel].modelContent += '\n';
                                    modelContents[referencedModel].modelContent += '\t ' + referencedModel + '.associate =  function (models) {\n';
                                    modelContents[referencedModel].modelContent += '\t\tmodels.' + referencedModel + '.hasOne(models.'+ associationKey +
                                        ', {foreignKey: \'id_'+ uncapitalize(referencedModel) + '\', onDelete:\'CASCADE\'});\n';
                                    // modelContents[referencedModel].modelContent += '\t};\n';
                                }

                            } else if (sourceCardinality === '1' && targetCardinality === '1') {
                                if (associationKey === referencedModel) { // Recursive relation
                                    modelContents[referencedModel].modelContent += '\n';
                                    // modelContents[referencedModel].modelContent += '\t ' + referencedModel + '.associate =  function (models) {\n';
                                    modelContents[referencedModel].modelContent += '\t\tmodels.' + referencedModel + '.hasOne(models.'+ associationKey +
                                        ', {foreignKey: \'id_'+ uncapitalize(referencedModel) + '_parent\'});\n';
                                    // modelContents[referencedModel].modelContent += '\t};\n';
                                } else {
                                    modelContents[referencedModel].modelContent += '\n';
                                    // modelContents[referencedModel].modelContent += '\t ' + referencedModel + '.associate =  function (models) {\n';
                                    modelContents[referencedModel].modelContent += '\t\tmodels.' + referencedModel + '.hasOne(models.'+ associationKey +
                                        ', {foreignKey: \'id_'+ sourceAttributeName + '\', onDelete:\'CASCADE\'});\n';
                                    // modelContents[referencedModel].modelContent += '\t};\n';
                                }
                            } else {
                                throw new Error('this error won\'t happen ever, because error already thrown sooner');
                            }
                        }
                    }
                }
                // modelContents[currentKey].modelContent += '\t};\n';
            }

        }

        console.log('MANANING LAST LINE OF ASSOCIATION IN EVERY MODELS : };');
        console.log('ASSOCIATIONS DETAILS =====>');
        console.dir(associations, {depth:null, colors:true});

        var modelLastLineDone = {};
        for (const [index, [associationKey, associationValue]] of Object.entries(Object.entries(associations))) {
            modelContents[associationKey].modelContent += '\t};\n';
            modelLastLineDone[associationKey] = modelLastLineDone[associationKey] || {};
            modelLastLineDone[associationKey] = {model: associationKey, done: true};
            for (let i = 0; i < associationValue.length; i++){
                console.log('DEBUG REMOVE THIS associationValue[i].referencedModel = ', associationValue[i].referencedModel);
                modelLastLineDone[associationValue[i].referencedModel] = modelLastLineDone[associationValue[i].referencedModel] || {};
                if (!(modelLastLineDone[associationValue[i].referencedModel].done)){
                    modelContents[associationValue[i].referencedModel].modelContent += '\n\t};\n';
                    modelLastLineDone[associationValue[i].referencedModel] = {model: associationValue[i].referencedModel, done: true};
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

function getModelToUseForOperation(modelSchemas, dao, httpMethod, params, httpMethodContent, path) {
    let modelToUseForOperation = '';
    if (modelSchemas[dao]) {
        modelToUseForOperation = dao;
    } else {
        if (httpMethod === 'post' || httpMethod === 'put') {
            // Find parameter type to find which Models will be used for sequelize in the DAO
            for (const [paramIndex, [paramName, paramValue]] of Object.entries(Object.entries(params))) {
                if (paramValue.schema) {
                    if (paramValue.schema.$ref) {
                        const temp = paramValue.schema.split('/');
                        modelToUseForOperation = temp[temp.length - 1];
                    } else if (paramValue.schema.items) {
                        if (paramValue.schema.items.$ref) {
                            const temp = paramValue.schema.items.$ref.split('/');
                            modelToUseForOperation = temp[temp.length - 1];
                        } else {
                            console.log('In ' + dao + ' with path ' + path + ' : ' + httpMethodContent.operationId + ' must return an object...');
                            modelToUseForOperation = '<<INSERT MODEL>>';
                        }
                    } else {
                        console.log('In ' + dao + ' with path ' + path + ' : ' + httpMethodContent.operationId + ' must return an object...');
                        modelToUseForOperation = '<<INSERT MODEL>>';
                    }
                } else {
                    modelToUseForOperation = '<<INSERT MODEL>>';
                }
            }

        } else if (httpMethod === 'get') {
            // Find type in response node
            if (httpMethodContent.responses['200'].schema) {
                if (httpMethodContent.responses['200'].schema.$ref) {
                    const temp = httpMethodContent.responses['200'].schema.$ref.split('/');
                    modelToUseForOperation = temp[temp.length - 1];
                } else if (httpMethodContent.responses['200'].schema.items) {
                    if (httpMethodContent.responses['200'].schema.items.$ref) {
                        const temp = httpMethodContent.responses['200'].schema.items.$ref.split('/');
                        modelToUseForOperation = temp[temp.length - 1];
                    } else {
                        // Method returns something that is not an object
                        console.log('In ' + dao + ' with path ' + path + ' : ' + httpMethodContent.operationId + ' must return an object...');
                        modelToUseForOperation = '<<INSERT MODEL>>';
                    }
                } else {
                    console.log('In ' + dao + ' with path ' + path + ' : ' + httpMethodContent.operationId + ' must return an object...');
                    modelToUseForOperation = '<<INSERT MODEL>>';
                }
            }
        } else if (httpMethod === 'delete') {
            for (const [paramIndex, [paramName, paramValue]] of Object.entries(Object.entries(params))) {
                if (paramValue.schema) {
                    if (paramValue.schema.$ref) {
                        const temp = paramValue.schema.split('/');
                        modelToUseForOperation = temp[temp.length - 1];
                    } else if (paramValue.schema.items) {
                        if (paramValue.schema.items.$ref) {
                            const temp = paramValue.schema.items.$ref.split('/');
                            modelToUseForOperation = temp[temp.length - 1];
                        } else {
                            console.log('In ' + dao + ' with path ' + path + ' : ' + httpMethodContent.operationId + ' must return an object...');
                            modelToUseForOperation = '<<INSERT MODEL>>';
                        }
                    } else {
                        console.log('In ' + dao + ' with path ' + path + ' : ' + httpMethodContent.operationId + ' must return an object...');
                        modelToUseForOperation = '<<INSERT MODEL>>';
                    }
                } else {
                    modelToUseForOperation = '<<INSERT MODEL>>';
                }
            }
        }
    }
    return modelToUseForOperation;
}

function getSequelizeMethod(httpMethod, httpMethodContent, dao, path) {
    console.log('PROCESSING : ' + path + ' method : ' + httpMethod);
    console.log('httpMethodContent : ', httpMethodContent);
    let sequelizeMethod = '';
    switch (httpMethod) {
        case 'post': {
            sequelizeMethod = 'create';
        }
        break;
        case 'put': {
            sequelizeMethod = 'update';

        }
        break;
        case 'get': {
            // can be find or findAll, if response = array then findAll, else find
            if (httpMethodContent.responses['200'].schema) {
                if (httpMethodContent.responses['200'].schema.$ref) {
                    sequelizeMethod = 'find'
                } else if (httpMethodContent.responses['200'].schema.items) {
                    sequelizeMethod = 'findAll'
                } else {
                    console.log('In ' + dao + ' with path ' + path + ' : ' + httpMethodContent.operationId + ' must return an object...');
                    sequelizeMethod = '<<INSERT METHOD>>';
                }
            }
        }
        break;
        case 'delete': {
            sequelizeMethod = 'destroy';
        }
        break;
        default: {
            throw new Error('http method must be post, put, get or delete. Encountered ' + httpMethod + ' in ' + dao + ' for path : ' + path);
        }
    }
    return sequelizeMethod;
}

/**
 * Generate DAO layer from path & models
 * @param pathSchema
 */
function generateDaos(completeSwaggerSchema) {
    const modelSchema = completeSwaggerSchema.definitions;
    const modelSchemas = {};
    for (const [index, [key, value]] of Object.entries(Object.entries(modelSchema))) {
        var result = JSON.parse(JSON.stringify(value.properties));
        modelSchemas[key] = result;
    }

	const pathsSchema = completeSwaggerSchema.paths;

    const daos = {}
    for (const [pathIndex, [path, pathContent]] of Object.entries(Object.entries(pathsSchema))) { // For each path in paths
        // let daoStringContent = '';
        console.log('Path found : ' + path);
        const split = path.split('/');
        const dao = capitalize(split[1]);
        console.log('Dao concerned => ', dao);

        let initContent = 'const models = require(\'../models\');\n';
        initContent += 'const Op = models.Sequelize.Op;\n\n';
        // initContent += 'const moment = require(\'moment\');\n\n';

        daos[dao] = daos[dao] || {key:dao, content: initContent};

        // daos[dao].content += 'const models = require(\'../models\');';

        for (const [index, [httpMethod, httpMethodContent]] of Object.entries(Object.entries(pathContent))) {
            // console.log('\thttpMethod : ' , httpMethod);
            // console.log('\toperationId : ' , httpMethodContent.operationId);


            // Flag and keep parameters for operation : httpMethodContent.operationId
            let params = {};
            for (let i = 0; i < httpMethodContent.parameters.length; i++) {
                params[httpMethodContent.parameters[i].name] = {
                    paramName: httpMethodContent.parameters[i].name,
                    paramDef: httpMethodContent.parameters[i]
                };
            }

            // Build parameter string for operationId method signature
            let operationSignature = '';
            for (const [paramIndex, [paramName, paramValue]] of Object.entries(Object.entries(params))) {
                operationSignature += paramName + ', ';
            }
            operationSignature = operationSignature.substring(0, operationSignature.length - 2);
            daos[dao].content += 'exports.' + httpMethodContent.operationId + ' = function(' + operationSignature + ') {\n'


            // Find Model for sequelize method to use
            const modelToUseForOperation = getModelToUseForOperation(modelSchemas, dao, httpMethod, params, httpMethodContent, path);

            const sequelizeMethod = getSequelizeMethod(httpMethod, httpMethodContent, dao, path);

            daos[dao].content += '\treturn models.' + modelToUseForOperation + '.' + sequelizeMethod + '({\n';
            if (sequelizeMethod === 'find' || sequelizeMethod === 'findAll') {
                daos[dao].content += '\t\tinclude: [\n';
                daos[dao].content += '\t\t\t//{\n';
                daos[dao].content += '\t\t\t\t//model: models.<<MODEL TO BE INCLUDED>>,\n';
                daos[dao].content += '\t\t\t\t//attributes: {exclude: [<<ATTRIBUTES TO BE EXCLUDED>>]}\n';
                daos[dao].content += '\t\t\t//}\n';
                daos[dao].content += '\t\t],\n';
                daos[dao].content += '\t\twhere: {\n';
                daos[dao].content += '\t\t\t//<<ATTRIBUTE>>: <<PARAM>>,\n';
                daos[dao].content += '\t\t\t//<<ANOTHER_ATTRIBUTE>>: <<ANOTHER_PARAM>>\n';
                daos[dao].content += '\t\t}\n';
                daos[dao].content += '\t});\n';
                daos[dao].content += '};\n\n';
            } else if (sequelizeMethod === 'destroy') {
                daos[dao].content += '\t\twhere: {\n';
                daos[dao].content += '\t\t\t//id: valueId,\n';
                daos[dao].content += '\t\t}\n';
                daos[dao].content += '\t});\n';
                daos[dao].content += '};\n\n';
            } else if (sequelizeMethod === 'update') {
                daos[dao].content += '\t\t\t//attribute1: valueAttribute1,\n';
                daos[dao].content += '\t\t\t//attribute2: valueAttribute2,\n';
                daos[dao].content += '\t\t},\n';
                daos[dao].content += '\t\t{\n';
                daos[dao].content += '\t\t\twhere: {\n';
                daos[dao].content += '\t\t\t\t//id: idValue\n';
                daos[dao].content += '\t\t\t}\n';
                daos[dao].content += '\t\t});\n';
                daos[dao].content += '};\n\n';
            } else if (sequelizeMethod === 'create') {
                daos[dao].content += '\t\t//attribute1: valueAttribute1,\n';
                daos[dao].content += '\t\t//attribute2: valueAttribute2,\n';
                daos[dao].content += '\t});\n';
                daos[dao].content += '};\n\n';
            }
            // daos[dao].content = removeEscaped(daos[dao].content); // NEEDED ????

        }


    }

    for (const [index, [key, value]] of Object.entries(Object.entries(daos))) {
        generateFileSync('./dao', key + 'Dao' + '.js',  value.content);
    }

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
    generateDaos(completeSwaggerSchema);
}

module.exports = {
	setDialect, generate, generateOne, generateFile, generateFileSync, deleteFile, generateFolders, generateAll,
	generateModels, generateDaos, removeEscaped, generateModelIndex
};
