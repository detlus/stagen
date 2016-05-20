var path = require('path'),
  fs = require('fs'),
  LibraryManager = require('./library-manager'),
  stagen_util = require('./util'),
  _ = require('underscore');

var Theme = function(name, site) {
  this.site = site;
  this.name = name;
  this.theme_dir =  path.join(this.site.path, this.site.configuration.themes_dir, this.name);
  if (!stagen_util.fileExists(this.theme_dir)) {
    this.site.addError("Theme '" + this.name + "' does not exists.");
  }
  this.library_manager = new LibraryManager(this.site);
  this.library_manager.addLibraries(this.site.getLibraries());
  this.library_manager.addLibraries(this.getLibraries());
};

Theme.prototype.getInfo = function() {
  if (!this.info) {
    var theme_info_file = path.join(this.theme_dir, this.name + '.yml');
    this.info =  _.defaults(stagen_util.readYamlFile(theme_info_file) || {}, {
      exclude: [],
      libraries: {}
    });
  }
  return this.info;
};

Theme.prototype.getLibraries = function() {
  var libraries_file = path.join(this.theme_dir, 'libraries.yml');
  return stagen_util.readYamlFile(libraries_file) || {};
};

/**
 * Read theme settings for this theme from site configuration.
 *
 * @return object
 */
Theme.prototype.settings = function() {
  if (!this.theme_settings) {
    this.theme_settings = {};
    if (this.site.configuration.theme_settings && this.site.configuration.theme_settings[this.name]) {
      this.theme_settings = this.site.configuration.theme_settings[this.name];
    }
  }
  return this.theme_settings;
};


module.exports = Theme;
