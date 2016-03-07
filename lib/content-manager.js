/*jslint node: true */
"use strict";

var _ = require('underscore'),
  fs = require('fs'),
  path = require('path'),
  fm = require('front-matter'),
  mkdirp = require('mkdirp'),
  stagen_util = require('../lib/util'),
  yaml = require('js-yaml');


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

/**
 * Prepare meta information about files of a specific content type.
 */
ContentManager.prototype.scanFiles = function(type) {
  var that = this;
  var filesinfo = stagen_util.listDir(this.site, type + 's', '');
  var content_dir = this.site.getContentDir();
  _.each(filesinfo, function(fileinfo, index) {
    var file_path = path.join(content_dir, fileinfo.filename);
    var data = fs.readFileSync(file_path, {encoding: 'utf8'});
    var fm_data;
    try {
      fm_data = fm(data);
    }
    catch (e) {
      that.site.addError("Front matter read failed for " + fileinfo.filename, e);
      return;
    }
    fileinfo = _.extend(fileinfo, _.pick(fm_data.attributes, that.site.configuration.content_indexs));
    var filename_with_date_pattern = /^(\d{4}\-\d{2}\-\d{2})-.*/;
    var basefilename = path.parse(fileinfo.filename).base;

    if (!fileinfo.datetime && filename_with_date_pattern.test(basefilename)) {
      var date = new Date(filename_with_date_pattern.exec(basefilename)[1]);
      fileinfo.datetime = date;
    }
    filesinfo[index] = fileinfo;
  });
  // Sort in descending order of date time.
  filesinfo.sort(function(a, b) {
    if (!a.datetime && b.datetime) {
      return 1;
    }
    else if (a.datetime && !b.datetime) {
      return -1;
    }
    else if (!a.datetime && !b.datetime) {
      return 0;
    }
    return b.datetime.getTime() - a.datetime.getTime();
  });

  fs.writeFileSync(path.join(this.site.getCacheDir(), 'fileinfo.json'), JSON.stringify(filesinfo), {encoding: 'utf8'} );
  return filesinfo;
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

ContentManager.prototype.copyThemeAssets = function() {
  var that = this;
  var theme_dir = this.site.getThemeDir();
  var output_dir = this.site.getOutputDir();
  var theme_info = this.getThemeInfo();
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

ContentManager.prototype.getThemeInfo = function() {
  var info = {};
  var theme_info_file = path.join(this.site.getThemeDir(), this.site.configuration.theme + '.yml');
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
    exclude: []
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
    var filesinfo = that.scanFiles(type);
    _.each(filesinfo, function(fileinfo){
        var content = new class_name(that, fileinfo.filename);
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
