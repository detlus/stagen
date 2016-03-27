/*jslint node: true */
"use strict";

var _ = require('underscore'),
  fs = require('fs'),
  path = require('path'),
  mkdirp = require('mkdirp'),
  stagen_util = require('../lib/util');


var ContentManager = function(site) {
  this.site = site;
  this.output_map = {};
  this.type_classes = {};
  mkdirp.sync(this.site.getCacheDir());
};

/**
 * Register a content type handler.
 */
ContentManager.prototype.registerType = function(class_name) {
  this.type_classes[class_name.type] = class_name;
};

ContentManager.prototype.getTypeClass = function(type) {
  return this.type_classes[type];
};

ContentManager.cache = {};
/**
 * Prepare meta information about files of a specific content type.
 */
ContentManager.prototype.scanFiles = function(type, options) {
  options = _.defaults(options || {}, {reset: false, filter: {}});
  var contents = [];
  var contents_info = [];
  if (_.isUndefined(ContentManager.cache[type]) || options.reset) {
    var that = this;
    var filesinfo_temp = stagen_util.listDir(this.site, type + 's', '');
    var content_dir = this.site.getContentDir();
    _.each(filesinfo_temp, function(fileinfo, index) {
      var content = new that.type_classes[type](that, fileinfo.filename);
      if (!content.isValid()) {
        return;
      }
      contents.push(content);
      contents_info.push(content.data);
    });
    // Sort in descending order of date time.
    contents.sort(function(a, b) {
      if (that.type_classes[type].sort) {
        return that.type_classes[type].sort(a, b);
      }
      // By default they are equal.
      return 0;
    });

    fs.writeFileSync(path.join(this.site.getCacheDir(), type + '-fileinfo.json'), JSON.stringify(contents_info), {encoding: 'utf8'} );
    ContentManager.cache[type] = contents;
  }
  else {
    contents = ContentManager.cache[type];
  }
  return contents;
};

ContentManager.prototype.addOutput = function(input_filepath, output_file_paths) {
  if (!this.output_map[input_filepath]) {
    this.output_map[input_filepath] = [];
  }
  if (Array.isArray(output_file_paths)) {
    this.output_map[input_filepath].concat(output_file_paths);
  }
  else {
    this.output_map[input_filepath].push(output_file_paths);
  }
};

ContentManager.prototype.writeOutputMap = function() {
  fs.writeFileSync(path.join(this.site.getCacheDir(), 'outputmap.json'), JSON.stringify(this.output_map), {encoding: 'utf8'} );
};

ContentManager.prototype.copyAssets = function() {
  var that = this;
  var assets_dir = path.join(this.site.getContentDir(), 'assets');
  var output_dir = this.site.getOutputDir();
  var assets = stagen_util.listDir(
    this.site,
    '', '',
    {root: assets_dir}
  );
  // Copy each of the assets to output dir.
  _.each(assets, function(stat){
    that.copyFile(path.join(assets_dir, stat.filename), path.join(output_dir, stat.filename));
  });
};

ContentManager.prototype.copyThemeAssets = function() {
  var that = this;
  var theme_dir = this.site.getThemeDir();
  var output_dir = this.site.getOutputDir();
  var theme_info = this.site.getThemeInfo();
  var theme_assets = stagen_util.listDir(
    this.site,
    '', '',
    {
      root: theme_dir,
      filter: function(filename, stat) {
        // Files and directories starting with underscode should not be considered.
        return filename.charAt(0) !== '_' && theme_info.exclude.indexOf(filename.split('/', 1)[0]) == -1;
      }
    }
  );
  // Copy each of the assets from theme to output dir.
  _.each(theme_assets, function(stat){
    that.copyFile(path.join(theme_dir, stat.filename), path.join(output_dir, stat.filename));
  });
};

ContentManager.prototype.copyFile = function(source, destination) {
  mkdirp.sync(path.dirname(destination));
  var data = fs.readFileSync(source);
  fs.writeFileSync(destination, data);
};

ContentManager.prototype.generateOutput = function() {
  var that = this;
  _.each(this.type_classes, function(class_name, type) {
    var contents = that.scanFiles(type);
    _.each(contents, function(content){
        if (content.isValid()) {
          try {
            content.generate();
          }
          catch(e) {
            that.site.addError("Content generation failed for " + fileinfo.filename, e);
          }
        }
        else {

        }
    });
  });
};

ContentManager.prototype.writeOutput = function(data, filename, input_filepath) {
  var output_file_path = path.join(this.site.getOutputDir(), filename);
  mkdirp.sync(path.dirname(output_file_path));
  fs.writeFileSync(output_file_path, data, {encoding: 'utf8'} );
  this.addOutput(input_filepath, filename);
};

module.exports = ContentManager;
