var grunt = require('grunt');
var path = require("path");
var webpack = require("webpack");

module.exports = function (grunt) {

    'use strict';

    require('load-grunt-tasks')(grunt);
    require('time-grunt')(grunt);

    grunt.initConfig({
        src: 'src',
        dist: 'dist',
        build: 'build',

        pkg: grunt.file.readJSON('package.json'),

        webpack: {
            dist: {
                entry: './build/compile/app.js',

                output: {
                    path: './build',
                    filename: 'core.js'
                },

                module: {
                    loaders: [{
                        test: /\.js$/,
                        loaders: ['ng-annotate'],
                        exclude: /node_modules|lib/
                    }, ]
                },

                resolve: {
                    root: [path.join(__dirname, "lib")]
                },

                plugins: [
                    new webpack.ResolverPlugin(
                        new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin("bower.json", ["main"])
                    )
                ]
            },

            develop: {
                entry: './src/app.js',

                output: {
                    path: './dist/js',
                    filename: 'core.js'
                },

                resolve: {
                    root: [path.join(__dirname, "lib")]
                },

                plugins: [
                    new webpack.ResolverPlugin(
                        new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin("bower.json", ["main"])
                    )
                ],

                devtool: 'source-map'
            },

            app: {
                entry: './build/compile/app.js',

                output: {
                    path: './dist/js',
                    filename: 'app.js'
                },

                module: {
                    loaders: [{
                        test: /\.js$/,
                        loaders: ['ng-annotate'],
                        exclude: /node_modules|lib/
                    }, ]
                },

                resolve: {
                    root: [path.join(__dirname, "lib")]
                },
                plugins: [
                    new webpack.ResolverPlugin(
                        new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin("bower.json", ["main"])
                    )
                ],

                devtool: 'source-map'
            }
        },

        ts: {
            options: {
                module: 'commonjs',
                sourceMap: false,
                target: 'es5',
                removeComments: false,
                noResolve: true,
                noImplicitAny: false,
                preserveConstEnums: true,
                emitDecoratorMetadata: true,
                experimentalDecorators: true,
            },
            dist: {
                src: ["<%= src %>/**/*.ts"],
                outDir: "build/compile"
            },
            develop: {
                options: {
                    inlineSourceMap: true,
                    inlineSources: true,
                },
                src: ['<%= src %>/**/*.ts'],
                outDir: "src"
            }
        },

        uglify: {
            options: {
                mangle: true,
                sourceMap: false
            },

            dist: {
                files: {
                    '<%= dist %>/js/core.min.js': [
                        '<%= build %>/core.js'
                    ]
                }
            }

        },

        protractor: {
            options: {
                configFile: "test/protractor.config.js",
                keepAlive: false, // If false, the grunt process stops when the test fails.
                noColor: false, // If true, protractor will not use colors in its output.
                args: {}
            },
            all: { // Grunt requires at least one target to run so you can simply put 'all: {}' here too.
                options: {
                    args: {} // Target-specific arguments
                }
            }
        },

        conventionalChangelog: {
            options: {
                changelogOpts: {
                    preset: 'angular'
                }
            },
            release: {
                src: 'CHANGELOG.md'
            }
        },

        bump: {
            options: {
                files: ['package.json', 'bower.json', '<%= src %>/app.js'],
                updateConfigs: ['pkg'],
                commit: true,
                commitMessage: 'Release v%VERSION%',
                commitFiles: ['package.json', 'bower.json', 'CHANGELOG.md', '<%= src %>/app.js', '<%= dist %>/**/*'],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Version %VERSION%',
                push: true,
                pushTo: 'origin',
                gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
                globalReplace: false,
                prereleaseName: 'rc',
                regExp: false
            }
        }

    });

    grunt.registerTask('develop', ['ts:develop', 'webpack:develop']);
    grunt.registerTask('build', ['ts:dist', 'webpack:dist', 'uglify']);
    grunt.registerTask('release', ['bump-only:patch', 'conventionalChangelog', 'build', 'bump-commit']);
    grunt.registerTask('default', ['build']);
};
