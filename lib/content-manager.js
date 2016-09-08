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
  this.metadata = this.getMetadata();
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
  if (!this.metadata.output_map[input_filepath]) {
    this.metadata.output_map[input_filepath] = [];
  }
  if (Array.isArray(output_file_paths)) {
    this.metadata.output_map[input_filepath].concat(output_file_paths);
  }
  else {
    this.metadata.output_map[input_filepath].push(output_file_paths);
  }
};

ContentManager.prototype.getMetadata = function() {
  var metadata_cache_filepath = path.join(this.site.getCacheDir(), 'metadata.json');
  var metadata_info = {
    output_map: {},
    dependency_map: {},
    subscribers: {
      content_types: {}
    }
  };
  if (stagen_util.fileExists(metadata_cache_filepath)) {
    metadata_info = require(metadata_cache_filepath);
  }
  return metadata_info;
};

ContentManager.prototype.writeMetadata = function() {
  fs.writeFileSync(path.join(this.site.getCacheDir(), 'metadata.json'), JSON.stringify(this.metadata), {encoding: 'utf8'} );
};

ContentManager.prototype.cleanOutputForContent = function(filename) {
  var that = this;
  if (this.metadata.output_map[filename]) {
    this.generated_contents.splice(this.generated_contents.indexOf(filename), 1);
    _.each(this.metadata.output_map[filename], function(output_file) {
      var output_file_path = path.join(that.site.getOutputDir(), output_file);
      if (stagen_util.fileExists(output_file_path)) {
        fs.unlinkSync(path.join(that.site.getOutputDir(), output_file));
      }
    });
    this.generateOutputForDependents(filename, true);
    this.generateOutputForSubscribers(this.getContentTypeFromFilename(filename));
    delete this.metadata.output_map[filename];
    delete this.metadata.dependency_map[filename];
  }
  this.writeMetadata();
};

ContentManager.prototype.addDependency = function(dependee, dependent) {
  if (!this.metadata.dependency_map[dependee]) {
    this.metadata.dependency_map[dependee] = [];
  }
  if (this.metadata.dependency_map[dependee].indexOf(dependent) == -1) {
    this.metadata.dependency_map[dependee].push(dependent);
  }
};

ContentManager.prototype.subscribeContentType = function(filename, content_type) {
  if (!this.metadata.subscribers.content_types[content_type]) {
    this.metadata.subscribers.content_types[content_type] = [];
  }
  if (this.metadata.subscribers.content_types[content_type].indexOf(filename) == -1) {
    this.metadata.subscribers.content_types[content_type].push(filename);
  }
};

ContentManager.prototype.getContentTypeSubscribers = function(content_type) {
  if (this.metadata.subscribers.content_types[content_type]) {
    return this.metadata.subscribers.content_types[content_type];
  }
  else {
    return [];
  }
};

ContentManager.prototype.getContentTypeFromFilename = function(filename) {
  var type_plural = filename.split(path.sep, 1)[0];
  return type_plural.substring(0, type_plural.length - 1);
};

ContentManager.prototype.generateOutputForDependents = function(filename, reset) {
  var that = this;
  if (this.metadata.dependency_map[filename]) {
    _.each(this.metadata.dependency_map[filename], function(dependent){
      that.generateSingleOutput(dependent, reset);
    });
  }
};

ContentManager.prototype.generateOutputForSubscribers = function(content_type) {
  var that = this;
  _.each(this.getContentTypeSubscribers(content_type), function(filename){
    that.generateSingleOutput(filename, true);
  });
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

  var content = this.loadContent(filename, reset);
  if (content) {
    try {
      // Clear already existing output for the content.
      this.cleanOutputForContent(filename);
      // Generate output for the content.
      content.generate();
      // Generate output for all dependent contents.
      this.generateOutputForDependents(filename, reset);

      this.generateOutputForSubscribers(content.type);

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

module.exports = ContentManager;
