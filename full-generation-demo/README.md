# Project purpose
This is a fake project. The objective is to demonstrate the full-generation of a node project starting from a swagger specification file.<br />


# Technical core
* Generation will produce an express based nodejs server
* Generation will provide a swagger-tool framework all set up
    * swagger-ui is enabled
* Generation is split with 2 parts
    * swagger-codegen
        * Main node file : index.js
        * Service layer (which only serve as link to DAO layer)
        * Controller layer
        * swagger.json conversion to swagger.yaml used by the swagger-ui
        * various tools and utils
    * swagelize
        * Sequelize models and index generation
        * DAO Layer : squeleton is provided, developer will have to code the content of each methods
        * Possibly generation of the database tables

# Step by step process of generation

* Install a database, we'll use MariaDB in this demo
    * Set up a DB_USER
    * Set up a DB_PASSWORD
    * Create a schema DB_NAME
    * Update your config.js to fit these values
* Install globally rimraf (delete folders lib) and grunt (task runner lib)
    * npm install -g rimraf
    * npm install -g grunt
* Download ZIP from github and extract it somewhere
* Run this command in project root : npm install
* Go to folder full-generation-demo
* Run npm install
* Generation part
    * 1st part is swagger-codegen generation
        * We will be using the JAR contained in swagger folder
        * Run this command : npm run generate-api
    * 2nd part is swagelize generation
        * run this command : npm run generate-models
    * 3rd part is DB sync with sequelize
        * run this command : npm run generate-db
* By now, generation is completed
* Run project
    * run this commande : npm run start
* Server should be up and running, log indicates the URL where swagger-ui doc is
* LAST bu not LEAST
    * Code the content of the DAO layer
