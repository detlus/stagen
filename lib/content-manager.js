/*jslint node: true */
"use strict";

var _ = require('underscore'),
  fs = require('fs'),
  path = require('path'),
  mkdirp = require('mkdirp'),
  stagen_util = require('../lib/util'),
  util = require('util');


var ContentManager = function(site) {
  this.site = site;
  this.output_map = this.getOutputMapCache();
  this.dependency_map = this.getDependencyMapCache();
  this.type_classes = {};
  mkdirp.sync(this.site.getCacheDir());
  this.content_cache = {};
  this.generated_contents = [];
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

ContentManager.prototype.getOutputMapCache = function() {
  var output_map_cache_filepath = path.join(this.site.getCacheDir(), 'outputmap.json');
  var content_files_info = {};
  if (stagen_util.fileExists(output_map_cache_filepath)) {
    content_files_info = require(output_map_cache_filepath);
  }
  return content_files_info;
};

ContentManager.prototype.writeOutputMap = function() {
  fs.writeFileSync(path.join(this.site.getCacheDir(), 'outputmap.json'), JSON.stringify(this.output_map), {encoding: 'utf8'} );
};

ContentManager.prototype.cleanOutputForContent = function(filename) {
  var that = this;
  if (this.output_map[filename]) {
    _.each(this.output_map[filename], function(output_file) {
      var output_file_path = path.join(that.site.getOutputDir(), output_file);
      if (stagen_util.fileExists(output_file_path)) {
        fs.unlinkSync(path.join(that.site.getOutputDir(), output_file));
      }
    });
  }
  fs.writeFileSync(path.join(this.site.getCacheDir(), 'outputmap.json'), JSON.stringify(this.output_map), {encoding: 'utf8'} );
};

ContentManager.prototype.addDependency = function(dependee, dependent) {
  if (!this.dependency_map[dependee]) {
    this.dependency_map[dependee] = [];
  }
  this.dependency_map[dependee].push(dependent);
};

ContentManager.prototype.getDependencyMapCache = function() {
  var dependency_map_cache_filepath = path.join(this.site.getCacheDir(), 'dependency-map.json');
  var info = {};
  if (stagen_util.fileExists(dependency_map_cache_filepath)) {
    info = require(dependency_map_cache_filepath);
  }
  return info;
};

ContentManager.prototype.writeDependencyMap = function() {
  fs.writeFileSync(path.join(this.site.getCacheDir(), 'dependency-map.json'), JSON.stringify(this.dependency_map), {encoding: 'utf8'} );
};

ContentManager.prototype.generateOutputForDependents = function(filename, reset) {
  var that = this;
  if (this.dependency_map[filename]) {
    _.each(this.dependency_map[filename], function(dependent){
      that.generateSingleOutput(dependent, reset);
    });
  }
};

ContentManager.prototype.loadContent = function(filename, reset) {
  if (reset || !this.content_cache[filename]) {
    // Initialize to make it null rather than undefined.
    this.content_cache[filename] = null;
    // Get types directory name and remove last 's' character.
    var type = filename.split(path.sep, 1)[0].slice(0, -1);
    if (this.type_classes[type]) {
      var content = new this.type_classes[type](this, filename);
      if (content.isValid()) {
        this.content_cache[filename] = content;
      }
    }
    else {
      this.site.addError(util.format("Handler for content type '%s' does not exist.", type));
    }
  }
  return this.content_cache[filename];
};

ContentManager.prototype.generateSingleOutput = function(filename, reset) {
  if (!reset && this.generated_contents.indexOf(filename) > -1) {
    // Early exit if already generated.
    return;
  }
  else if (reset) {
    this.clearGeneratedStatus(content_path);
  }

  var content = this.loadContent(filename, reset);
  if (content) {
    try {
      // Clear already existing output for the content.
      this.cleanOutputForContent(filename);
      // Generate output for the content.
      content.generate();
      // Generate output for all dependent contents.
      this.generateOutputForDependents(filename, reset);

      this.generated_contents.push(filename);
    }
    catch(e) {
      this.site.addError("Content generation failed for " + filename, e);
    }
  }
};

ContentManager.prototype.generateOutput = function() {
  var that = this;
  var files_info_old = this.getContentFilesInfoCache();
  var files_info = stagen_util.listDir(this.site.getContentDir(), '', '');
  _.each(files_info, function(file_info){
    if (!files_info_old[file_info.filename] || files_info[file_info.filename].stat.mtime.getTime() != (new Date(files_info_old[file_info.filename].stat.mtime)).getTime()) {
      that.generateSingleOutput(file_info.filename);
    }
  });
  this.writeContentFilesInfoCache(files_info);
};

ContentManager.prototype.writeOutput = function(data, filename, input_filepath) {
  var output_file_path = path.join(this.site.getOutputDir(), filename);
  mkdirp.sync(path.dirname(output_file_path));
  fs.writeFileSync(output_file_path, data, {encoding: 'utf8'} );
  this.addOutput(input_filepath, filename);
};

ContentManager.prototype.getContentFilesInfoCache = function() {
  var content_filesinfo_cache_filepath = path.join(this.site.getCacheDir(), 'content-fileinfo.json');
  var content_files_info = {};
  if (stagen_util.fileExists(content_filesinfo_cache_filepath)) {
    content_files_info = require(content_filesinfo_cache_filepath);
  }
  return content_files_info;
};

ContentManager.prototype.writeContentFilesInfoCache = function(content_files_info) {
  fs.writeFileSync(path.join(this.site.getCacheDir(), 'content-fileinfo.json'), JSON.stringify(content_files_info), {encoding: 'utf8'} );
};

ContentManager.prototype.clearGeneratedStatus = function (filename) {
  this.generated_contents.splice(this.generated_contents.indexOf(filename), 1);
}

ContentManager.prototype.removeOutputFor = function (filename) {
  var that = this;
  if (this.output_map[filename]) {
    _.each(this.output_map[filename], function(output_file){
      fs.unlinkSync(path.join(that.site.getOutputDir(), output_file));
    });
    this.generateOutputForDependents(filename, true);
    delete this.output_map[filename];
    delete this.dependency_map[filename];
  }
  this.generated_contents.splice(this.generated_contents.indexOf(filename), 1);
}

module.exports = ContentManager;
