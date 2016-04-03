var path = require('path'),
  fs = require('fs'),
  LibraryManager = require('./library-manager'),
  stagen_util = require('./util'),
  _ = require('underscore');

var Theme = function(name, site) {
  this.site = site;
  this.name = name;
  this.theme_dir =  path.join(this.site.path, this.site.configuration.themes_dir, this.name);
  this.library_manager = new LibraryManager(this.site.configuration.site.baseurl);
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


module.exports = Theme;