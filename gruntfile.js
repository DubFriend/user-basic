'use strict';

module.exports = function (grunt) {
    grunt.initConfig({
        mochaTest: {
            all: {
                src: ['test/**/*.js']
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
    grunt.registerTask('test', ['mochaTest:all']);
};
