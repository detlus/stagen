/*jslint node: true */
"use strict";

import fs from 'fs';
import _ from 'underscore';
import mkdirp from 'mkdirp';
import path from 'path';
import { fileExists, listDir } from './util.js';
import { type } from 'os';


class ContentManager {
  constructor(site) {
    this.site = site;
    this.metadata = this.getMetadata();
    this.type_classes = {};
    mkdirp.sync(this.site.getCacheDir());
    this.content_cache = {};
    this.generated_contents = [];
  }
  /**
   * Register a content type handler.
   */
  registerType(class_name) {
    this.type_classes[class_name.type] = class_name;
  }
  getTypeClass(type) {
    return this.type_classes[type];
  }
  /**
   * Prepare meta information about files of a specific content type.
   */
  loadContents(type, options) {
    options = _.defaults(options || {}, { filter: {} });
    var contents = [];
    var contents_info = [];
    var that = this;
    var filesinfo_temp = listDir(this.site.getContentDir(), type + 's', '');
    _.each(filesinfo_temp, function (fileinfo, index) {
      var content = that.loadContent(fileinfo.filename);
      if (content) {
        contents.push(content);
        contents_info.push(content.data);
      }

    });
    // Sort in descending order of date time.
    contents.sort(function (a, b) {
      if (that.type_classes[type].sort) {
        return that.type_classes[type].sort(a, b);
      }
      // By default they are equal.
      return 0;
    });

    return contents;
  }
  addOutput(input_filepath, output_file_paths) {
    if (!this.metadata.output_map[input_filepath]) {
      this.metadata.output_map[input_filepath] = [];
    }
    if (Array.isArray(output_file_paths)) {
      this.metadata.output_map[input_filepath].concat(output_file_paths);
    }
    else {
      this.metadata.output_map[input_filepath].push(output_file_paths);
    }
  }
  getMetadata() {
    var metadata_cache_filepath = path.join(this.site.getCacheDir(), 'metadata.json');
    var metadata_info = {
      output_map: {},
      dependency_map: {},
      subscribers: {
        content_types: {}
      }
    };
    if (fileExists(metadata_cache_filepath)) {
      // metadata_info = require(metadata_cache_filepath);
      const jsonString = fs.readFileSync(metadata_cache_filepath, 'utf8');
      metadata_info = JSON.parse(jsonString);
    }
    return metadata_info;
  }
  writeMetadata() {
    fs.writeFileSync(path.join(this.site.getCacheDir(), 'metadata.json'), JSON.stringify(this.metadata), { encoding: 'utf8' });
  }
  cleanOutputForContent(filename) {
    var that = this;
    if (this.metadata.output_map[filename]) {
      this.generated_contents.splice(this.generated_contents.indexOf(filename), 1);
      _.each(this.metadata.output_map[filename], function (output_file) {
        var output_file_path = path.join(that.site.getOutputDir(), output_file);
        if (fileExists(output_file_path)) {
          fs.unlinkSync(path.join(that.site.getOutputDir(), output_file));
        }
      });
      this.generateOutputForDependents(filename, true);
      this.generateOutputForSubscribers(this.getContentTypeFromFilename(filename));
      delete this.metadata.output_map[filename];
      delete this.metadata.dependency_map[filename];
    }
    this.writeMetadata();
  }
  addDependency(dependee, dependent) {
    if (!this.metadata.dependency_map[dependee]) {
      this.metadata.dependency_map[dependee] = [];
    }
    if (this.metadata.dependency_map[dependee].indexOf(dependent) == -1) {
      this.metadata.dependency_map[dependee].push(dependent);
    }
  }
  subscribeContentType(filename, content_type) {
    if (!this.metadata.subscribers.content_types[content_type]) {
      this.metadata.subscribers.content_types[content_type] = [];
    }
    if (this.metadata.subscribers.content_types[content_type].indexOf(filename) == -1) {
      this.metadata.subscribers.content_types[content_type].push(filename);
    }
  }
  getContentTypeSubscribers(content_type) {
    if (this.metadata.subscribers.content_types[content_type]) {
      return this.metadata.subscribers.content_types[content_type];
    }
    else {
      return [];
    }
  }
  getContentTypeFromFilename(filename) {
    var type_plural = filename.split(path.sep, 1)[0];
    return type_plural.substring(0, type_plural.length - 1);
  }
  generateOutputForDependents(filename, reset) {
    var that = this;
    if (this.metadata.dependency_map[filename]) {
      _.each(this.metadata.dependency_map[filename], function (dependent) {
        that.generateSingleOutput(dependent, reset);
      });
    }
  }
  generateOutputForSubscribers(content_type) {
    var that = this;
    _.each(this.getContentTypeSubscribers(content_type), function (filename) {
      that.generateSingleOutput(filename, true);
    });
  }
  loadContent(filename, reset) {
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
  }
  generateSingleOutput(filename, reset) {
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
      catch (e) {
        this.site.addError("Content generation failed for " + filename, e);
      }
    }
  }
  generateOutput() {
    var that = this;
    var files_info_old = this.getContentFilesInfoCache();
    var files_info = listDir(this.site.getContentDir(), '', '');
    _.each(files_info, function (file_info) {
      if (!files_info_old[file_info.filename] || files_info[file_info.filename].stat.mtime.getTime() != (new Date(files_info_old[file_info.filename].stat.mtime)).getTime()) {
        that.generateSingleOutput(file_info.filename);
      }
    });
    this.writeContentFilesInfoCache(files_info);
  }
  writeOutput(data, filename, input_filepath) {
    var output_file_path = path.join(this.site.getOutputDir(), filename);
    mkdirp.sync(path.dirname(output_file_path));
    fs.writeFileSync(output_file_path, data, { encoding: 'utf8' });
    this.addOutput(input_filepath, filename);
  }
  getContentFilesInfoCache() {
    var content_filesinfo_cache_filepath = path.join(this.site.getCacheDir(), 'content-fileinfo.json');
    var content_files_info = {};
    if (fileExists(content_filesinfo_cache_filepath)) {
      // content_files_info = require(content_filesinfo_cache_filepath);
      const jsonString = fs.readFileSync(content_filesinfo_cache_filepath);
      content_files_info = JSON.parse(jsonString);
    }
    return content_files_info;
  }
  writeContentFilesInfoCache(content_files_info) {
    fs.writeFileSync(path.join(this.site.getCacheDir(), 'content-fileinfo.json'), JSON.stringify(content_files_info), { encoding: 'utf8' });
  }
}


export default ContentManager;
