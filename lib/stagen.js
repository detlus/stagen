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
  this.init();
};

// Site class to create site object representing a site.
Site.prototype.init = function() {
  var that = this;
  var config_file_path = this.path + '/_config.yml';
  var config_exists = false;
  try {
      fs.accessSync(config_file_path, fs.F_OK);
      config_exists = true;
  } catch (e) {
      // It isn't accessible
  }
  if (!config_exists) {
    throw 'Configuration file (_config.yml) does not exist at ' + this.path;
  }

  this.configuration = _.extend(
    yaml.safeLoad(fs.readFileSync(config_file_path, 'utf8')),
    {
      output_dir: '_site',
      content_dir: '_content',
      cache_dir: '_cache',
      content_indexs: ['layout', 'category', 'tags', 'datetime']
    }
  );
  new DataManager(this);
  this.configuration.site.data = new DataManager(this).getData();
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
      console.log(util.format("%s: %s", item.message, item.exception));
      // console.log(util.format("%s: %s\n\t%s", item.message, item.exception, item.exception.stack));
    });
  }
  console.log("Finalized generating output.");
};

/**
 * Removes all files from output directory.
 */
Site.prototype.clean = function() {
  var deleteFolderRecursive = require('../lib/util').deleteFolderRecursive;
  deleteFolderRecursive(this.getOutputDir());
  mkdirp(this.getOutputDir());
};

module.exports = {
  Site: Site
};
