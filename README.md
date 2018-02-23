ORIGINALY FORKED FROM : https://github.com/kingsquare/swagger-sequelize
====
this project is an open source project developed by Yoop Digital company: http://yoop.digital


Generate Sequelize model definitions from a Swagger 2.0 schema <br/><br/>
Tasks the lib does:
- Generate sequelize structure folders and files with definitions and associations
    - Generate a folder models with index.js containing Sequelize configuration and initialisation
    - Generate all models from swagger definitions node
    - Generate associations within sequelize model files
        - As of today, only One to Many associations are covered due to lack of swagger spec support of data models feature (no primary key definitions, no cardinality definitions)
        - (YET TO COME) One to one associations, many to many associations
- (YET TO COME) Generate a dao folder with all methods described in swagger path node including parameters and sequelize glu code

Restrictions : this libray has been developed for MariaDB project needs, so I only tested it for MariaDB sequelization in a nodejs project

====

Prequisites: 

- Create a description of your REST service in a JSON format (see [http://swagger.io/](Swagger.io)) 
- Create your app and install (see [http://docs.sequelizejs.com/en/latest/](Sequelizejs.com))

Currently, the project simply maps Swagger-datatypes to their Sequelize counterpart.

Sample usage:

```js
var swagelize = require('swagelize');
var fs = require('fs');
var Sequelize = require('sequelize');

var sequelize = new Sequelize('<your uri>');
var swaggerSpec = JSON.parse(fs.readFileSync('<your swagger.json>', 'utf-8'));

swagelize.generateAll(swaggerSpec);

```

**This project is assuming you have configured sequelize through a config.js contained in a config folder as specified on sequelize docs**
example of config.js
```js
module.exports = {
    "local": {
        "username": "root",
        "password": "admin",
        "database": "TEST_SWAGUELIZE",
        "host": "127.0.0.1",
        "dialect": "mysql",
        "port": "3306"
    }
};
```

In case you want to read from a `swagger.yaml` rather than from a `swagger.json`, you could replace the JSON-import

```js
var swaggerSpec = JSON.parse(fs.readFileSync('<your swagger.sjon>', 'utf-8'));
```

with a YAML-import
```js
var yaml = require('js-yaml');
var swaggerSpec = yaml.safeLoad(fs.readFileSync('<your swagger.yaml>', 'utf8'));
```

To be consistent, one should "officially" add js-yaml to the project:

```
npm install --save js-yaml
```

## Primary key

To make your primary key work in Sequelize one may need to mark `"x-primary-key": true` in the model definition in `swagger.json`:

```JSON
"definitions": {
    "Document": {
        "properties": {
            "id": {
                "type": "integer",
                "format": "int32",
                "description": "Unique Identifier representing a document",
                "x-primary-key": true
            },
```

And in `swagger.yaml`, it would be:

```YAML
definitions:
  # Model definition
  Document:
    properties:
      id:
        type: integer
        format: int32
        description: Unique Identifier representing a document
        x-primary-key: true
```
