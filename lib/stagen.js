/*jslint node: true */
"use strict";

var yaml = require('js-yaml'),
  fs = require('fs'),
  util = require('util'),
  _ = require('underscore'),
  mkdirp = require('mkdirp'),
  path = require('path'),
  DataManager = require('../lib/data-manager');


var Site = function(path) {
  this.path = path;
  this.errors = [];
};

// Site class to create site object representing a site.
Site.prototype.init = function() {
  this.configuration = {};
  var site_initializede = true;
  var that = this;
  var config_file_path = this.path + '/_config.yml';
  var site_paths_exists = false;
  var config_exists = false;
  try {
      fs.accessSync(this.path, fs.F_OK);
      site_paths_exists = true;
  } catch (e) {
      // It isn't accessible
  }
  if (site_paths_exists) {
    try {
        fs.accessSync(config_file_path, fs.F_OK);
        config_exists = true;
    } catch (e) {
        // It isn't accessible
    }
    if (!config_exists) {
      this.addError("Configuration file (_config.yml) does not exist at");
      site_initializede = false;
    }
    else {
      this.configuration = _.extend(
        yaml.safeLoad(fs.readFileSync(config_file_path, 'utf8')),
        {
          output_dir: '_site',
          content_dir: '_content',
          cache_dir: '_cache',
          content_indexs: ['layout', 'category', 'tags', 'datetime', 'published'],
          pandoc_path: 'pandoc',
          content_criteria: {
            published: true
          }
        }
      );
      if (!this.configuration.theme) {
        this.addError("A theme to be specified in configuration file.");
        site_initializede = false;
      }
      if (_.isUndefined(this.configuration.site.baseurl) || this.configuration.site.baseurl.length === 0) {
        this.configuration.site.baseurl = "/";
      }
      new DataManager(this);
      this.configuration.site.data = new DataManager(this).getData();
    }
  }
  else {
    this.addError("The path " + this.path + " does not exist");
    site_initializede = false;
  }
  return site_initializede;
};

Site.prototype.getOutputDir = function() {
  return this.path + '/' + this.configuration.output_dir;
};

Site.prototype.getContentDir = function() {
  return path.join(this.path, this.configuration.content_dir);
};

Site.prototype.getCacheDir = function() {
  return path.join(this.path, this.configuration.cache_dir);
};

Site.prototype.getThemeDir = function() {
  return path.join(this.path, '_themes', this.configuration.theme);
};

Site.prototype.getDataDir = function() {
  return path.join(this.path, '_data');
};

Site.prototype.addError = function(message, exception) {
  return this.errors.push({message: message, exception: exception});
};

Site.prototype.finalize = function() {
  if (this.errors.length) {
    console.log(util.format("There occured %d errors.", this.errors.length));
    _.each(this.errors, function(item) {
      if (_.isUndefined(item.exception)) {
        console.log(util.format("%s", item.message));
      }
      else {
        console.log(util.format("%s: %s", item.message, item.exception));
        // console.log(util.format("%s: %s\n\t%s", item.message, item.exception, item.exception.stack));
      }
    });
  }
  console.log("Finalized generating output.");
};

/**
 * Removes all files from output directory.
 */
Site.prototype.clean = function() {
  var deleteFolderRecursive = require('../lib/util').deleteFolderRecursive;
  // Delete all exising output files.
  deleteFolderRecursive(this.getOutputDir(), true);
  mkdirp(this.getOutputDir());
};

module.exports = {
  Site: Site
};
