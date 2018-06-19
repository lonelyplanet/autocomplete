module.exports = function(grunt) {

  "use strict";

  grunt.initConfig({

    pkg: grunt.file.readJSON("package.json"),

    shell: {
      cleanUp: {
        command: "rm -rfv dist/*"
      },
      clearConsole: {
        command: "clear"
      }
    },

    watch: {
      scripts: {
        files: [ "Gruntfile.js", "src/**/*", "spec/tests/*.js" ],
        tasks: [ "shell:clearConsole", "jasmine:amd" ],
        options: {
          nospawn: true
        }
      }
    },

    connect: {
      server: {
        options: {
          port: 8000
        }
      }
    },

    copy: {
      source: {
        expand: true,
        cwd: "src/",
        src: "**/autocomplete*",
        dest: "dist/",
        flatten: true,
        filter: "isFile"
      },
    },

    jasmine: {
      amd: {
        src: "src/js/*.js",
        options: {
          specs: "spec/tests/*.js",
          helpers: "node_modules/jasmine-jquery/lib/jasmine-jquery.js",
          vendor: "bower_components/jquery/dist/jquery.js",
          host: "http://127.0.0.1:8000",
          template: require("grunt-template-jasmine-requirejs"),
          templateOptions: {
            version: "bower_components/requirejs/require.js",
            requireConfig: {
              paths: {
                jquery: "bower_components/jquery/dist/jquery",
              },
            }
          }
        }
      }
    },

    bump: {
      options: {
        files: [ "package.json" ],
        updateConfigs: [],
        commit: true,
        commitMessage:  "Release v%VERSION%",
        commitFiles: [ "package.json" ], // "-a" for all files
        createTag: true,
        tagName: "v%VERSION%",
        tagMessage: "Version %VERSION%",
        push: true,
        pushTo: "origin master",
        gitDescribeOptions: "--tags" // options to use with "$ git describe"
      }
    },

    jshint: {
      src: [ "Gruntfile.js", "src/js/*.js" ],
      options: {
        jshintrc: "./.jshintrc"
      }
    },

    jscs: {
      src: [ "Gruntfile.js", "src/js/*.js" ],
      options: {
        config: "./.jscs.json"
      }
    }

  });

  // This loads in all the grunt tasks auto-magically.
  require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

  grunt.registerTask("default", [
    "lint",
    "connect",
    "jasmine:amd",
    "shell:cleanUp",
    "copy",
  ]);

  grunt.registerTask("dev", [
    "shell:clearConsole",
    "connect",
    "watch"
  ]);

  grunt.registerTask("lint", [
    "jscs",
    "jshint"
  ]);

};
