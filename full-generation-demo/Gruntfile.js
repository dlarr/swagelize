const fs = require('fs');
const swagelize = require('../index');
const env = process.env.NODE_ENV || 'local';

module.exports = function(grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    // Configuration de Grunt
    grunt.initConfig({
        copy: {
            files: {
                expand: true,
                dest: './build/',
                cwd: './',
                src: [
                    '**',                                           // take everything
                    '!**/Gruntfile.js',                             // exclude Gruntfile
                    '!**/.gitignore',                               // exclude .gitignore file
                    '!**/.gitlab-ci.yml',                           // exclude .gitlab-ci.yml file
                    '!**/.swagger-codegen-ignore',                  // exclude .swagger-codegen-ignore file
                    '!**/package-lock.json',                        // exclude package-lock.json file
                    '!**/README.md',                                // exclude README.md file
                    '!.swagger-codegen/**',                         // exclude .swagger-codegen/ folder
                    '!swagger/**',                                  // exclude swagger/ folder
                    // '!node_modules/**',                             // exclude node_modules,
                    '!build/**'                                     // exclude build/ folder
                ]
            }
        }
    });

    // Définition des tâches Grunt
    grunt.registerTask('doCopyBuild', 'copy');
    grunt.registerTask('default', '');
    grunt.registerTask('generateModels', 'A task that generate Sequelize stuff from swagger.json file.', async function() {
        grunt.log.writeln('GRUNG TASK LAUNCHED : generateModels');
        console.log('NODE_ENV = ', process.env.NODE_ENV);
        console.log('env = ', env);
        const swaggerSpec = JSON.parse(fs.readFileSync('./swagger/swagger2.json', 'utf-8'));
        swagelize.generateAll(swaggerSpec);
    });

    grunt.registerTask('generateDB', 'A task that generate the database according to models described.', async function() {
        grunt.log.writeln('GRUNG TASK LAUNCHED : generateDB');
        console.log('NODE_ENV = ', process.env.NODE_ENV);
        console.log('env = ', env);
        var db = require('./models/index.js');
        // console.log('db = ', db);
        var done = this.async();


        // Create/ Update tables
        db.sequelize.sync({force:true}).then(() => {
            console.log('SYNC DONE...');
            done();
        });
        grunt.log.writeln('GRUNG TASK END OF FILE');
    });
};