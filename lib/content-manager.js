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
  this.content_cache = {};
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

/**
 * Prepare meta information about files of a specific content type.
 */
ContentManager.prototype.loadContents = function(type, options) {
  options = _.defaults(options || {}, {filter: {}});
  var contents = [];
  var contents_info = [];
  var that = this;
  var filesinfo_temp = stagen_util.listDir(this.site.getContentDir(), type + 's', '');
  _.each(filesinfo_temp, function(fileinfo, index) {
    var content = that.loadContent(fileinfo.filename);
    if (content) {
      contents.push(content);
      contents_info.push(content.data);
    }

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
  var assets_dir = this.site.getAssetsDir();
  var output_dir = this.site.getOutputDir();
  var assets = stagen_util.listDir(
    assets_dir,
    '', ''
  );
  // Copy each of the assets to output dir.
  _.each(assets, function(stat){
    stagen_util.copyFile(path.join(assets_dir, stat.filename), path.join(output_dir, stat.filename));
  });
};

ContentManager.prototype.copyThemeAssets = function() {
  var that = this;
  var theme_dir = this.site.getThemeDir();
  var output_dir = this.site.getOutputDir();
  var theme_info = this.site.default_theme.getInfo();
  var theme_assets = stagen_util.listDir(
    theme_dir,
    '', '',
    {
      filter: function(filename, stat) {
        // Files and directories starting with underscode should not be considered.
        return filename.charAt(0) !== '_' && theme_info.exclude.indexOf(filename.split('/', 1)[0]) == -1;
      }
    }
  );
  // Copy each of the assets from theme to output dir.
  _.each(theme_assets, function(stat){
    stagen_util.copyFile(path.join(theme_dir, stat.filename), path.join(output_dir, stat.filename));
  });
};

ContentManager.prototype.loadContent = function(filename) {
  if (!this.content_cache[filename]) {
    // Get types directory name and remove last 's' character.
    var type = filename.split(path.sep, 1)[0].slice(0, -1);
    var content = new this.type_classes[type](this, filename);
    if (content.isValid()) {
      this.content_cache[filename] = content;
    }
    else {
      this.content_cache[filename] = null;
    }
  }
  return this.content_cache[filename];
};

ContentManager.prototype.generateSingleOutput = function(filename) {
  var content = this.loadContent(filename);
  if (content) {
    try {
      content.generate();
    }
    catch(e) {
      this.site.addError("Content generation failed for " + filename, e);
    }
  }
};

ContentManager.prototype.generateOutput = function() {
  var that = this;
  var files_info = stagen_util.listDir(this.site.getContentDir(), '', '');
  _.each(files_info, function(file_info){
    that.generateSingleOutput(file_info.filename);
  });
};

ContentManager.prototype.writeOutput = function(data, filename, input_filepath) {
  var output_file_path = path.join(this.site.getOutputDir(), filename);
  mkdirp.sync(path.dirname(output_file_path));
  fs.writeFileSync(output_file_path, data, {encoding: 'utf8'} );
  this.addOutput(input_filepath, filename);
};

module.exports = ContentManager;
