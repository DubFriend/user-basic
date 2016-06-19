'use strict';

module.exports = function (grunt) {
    grunt.initConfig({
        mochaTest: {
            unit: {
                src: ['test/**/*unit.js', '!test/confirmation-model-email.unit.js']
            },
            mail: {
                options: { timeout: 10000 },
                src: ['test/confirmation-model-email.unit.js']
            }
        },

        watch: {
            scripts: {
                files: ['**/*'],
                tasks: ['test'],
                options: { spawn: true }
            }
        }
    });

    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.registerTask('test', ['mochaTest:unit']);
    grunt.registerTask('test-mail', ['mochaTest:mail']);
};
