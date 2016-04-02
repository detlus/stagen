/*jslint node: true */
"use strict";

var yaml = require('js-yaml'),
  fs = require('fs'),
  util = require('util'),
  _ = require('underscore'),
  mkdirp = require('mkdirp'),
  path = require('path'),
  DataManager = require('../lib/data-manager'),
  yaml = require('js-yaml'),
  TemplateManager = require('./template-manager'),
  MenuManager = require('./menu-manager');


var Site = function(path) {
  this.path = path;
  this.errors = [];
};

// Site class to create site object representing a site.
Site.prototype.init = function() {
  this.configuration = {};
  var site_initializede = true;
  var that = this;
  var config_file_path = this.path + '/config.yml';
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
      this.addError("Configuration file (config.yml) does not exist at");
      site_initializede = false;
    }
    else {
      this.configuration = _.defaults(
        yaml.safeLoad(fs.readFileSync(config_file_path, 'utf8')),
        {
          output_dir: 'site',
          content_dir: 'content',
          cache_dir: '.cache',
          data_dir: 'data',
          themes_dir: 'themes',
          content_indexs: ['layout', 'category', 'tags', 'datetime', 'published'],
          pandoc_path: 'pandoc',
          content_criteria: {
            published: true
          },
          libraries: {}
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
      this.configuration.site.menu_manager = new MenuManager(this);
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
  return path.join(this.path, this.configuration.themes_dir, this.configuration.theme);
};

Site.prototype.getDataDir = function() {
  return path.join(this.path, this.configuration.data_dir);
};

Site.prototype.getTemplateManager = function() {
  if (!this.template_manager) {
    this.template_manager = new TemplateManager(this);
  }
  return this.template_manager;
};


Site.prototype.getThemeInfo = function() {
  var info = {};
  var theme_info_file = path.join(this.getThemeDir(), this.configuration.theme + '.yml');
  var file_exists = false;
  try{
    fs.statSync(theme_info_file);
    file_exists = true;
  }
  catch (e){

  }
  if (file_exists) {
    try {
      // Read YAML data from the file.
      info = yaml.safeLoad(fs.readFileSync(theme_info_file, 'utf8'));
    }
    catch (e) {

    }
  }
  return _.defaults(info, {
    exclude: [],
    libraries: {}
  });
};

Site.prototype.addError = function(message, exception) {
  return this.errors.push({message: message, exception: exception});
};

Site.prototype.setContentCriteria = function(property, value) {
  this.configuration.content_criteria[property] = value;
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
