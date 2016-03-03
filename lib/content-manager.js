/*jslint node: true */
"use strict";

var _ = require('underscore'),
  fs = require('fs'),
  path = require('path'),
  fm = require('front-matter'),
  kramed = require('kramed'),
  mkdirp = require('mkdirp'),
  stagen_util = require('../lib/util');


var ContentManager = function(site) {
  this.site = site;
  this.output_map = {};
  this.type_classes = {};
};

ContentManager.prototype.registerType = function(type, class_name) {
  this.type_classes[type] = class_name;
};

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
  this.output_map[input_filepath] = output_file_paths;
};

ContentManager.prototype.writeOutputMap = function() {
  fs.writeFileSync(path.join(this.site.getCacheDir(), 'outputmap.json'), JSON.stringify(this.output_map), {encoding: 'utf8'} );
};

ContentManager.prototype.copyThemeAssets = function() {
  var that = this;
  var theme_dir = this.site.getThemeDir();
  var output_dir = this.site.getOutputDir();

  var theme_assets = stagen_util.listDir(
    this.site,
    '', '',
    {
      root: theme_dir,
      filter: function(filename, stat) {
        // Files and directories starting with underscode should not be considered.
        return filename.charAt(0) !== '_';
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

ContentManager.prototype.getContentData = function(filename) {
  var file_path = path.join(this.site.getContentDir(), filename);
  var data = fs.readFileSync(file_path, {encoding: 'utf8'});

  if (!data.length) {
    return;
  }

  var content_data;
  try {
    content_data = fm(data);
  }
  catch (e) {
    this.site.addError("Content read failed for " + filename, e);
    return;
  }
  return _.extend(
    {body: kramed(content_data.body), path: filename},
    content_data.attributes
  );
};

ContentManager.prototype.generateOutput = function(type) {
  var that = this;
  // var filesinfo = stagen_util.listDir(this.site, '', '');
  var filesinfo = this.scanFiles(type);
  console.log(filesinfo);

  _.each(filesinfo, function(fileinfo, item ){
    // Consider only markdown files.
    if (['.md', '.markdown'].indexOf(path.extname(fileinfo.filename)) > -1 ) {
      var content = new that.type_classes[type](
        that,
        fileinfo.filename
      );
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
    }
  });
};

ContentManager.prototype.generateListingPages = function() {
  var that = this;
  var filesinfo = stagen_util.listDir(this.site, 'listings', '');
  var content_dir = this.site.getContentDir();
  var ListingPage = require('../lib/listing-page');

  _.each(filesinfo, function(fileinfo, item ){
    // Consider only markdown files.
    if (['.twig'].indexOf(path.extname(fileinfo.filename)) > -1 ) {
      var file_path = path.join(content_dir, fileinfo.filename);
      var data = fs.readFileSync(file_path, {encoding: 'utf8'});

      if (!data.length) {
        return;
      }

      var content_data;
      try {
        content_data = fm(data);
      }
      catch (e) {
        that.site.addError("Content read failed for " + fileinfo.filename, e);
        return;
      }
      if (!content_data.attributes.listing_item) {
        that.site.addError("Listing item does not specified in " + fileinfo.filename);
        return;
      }
      content_data.path = fileinfo.filename;

      var listing_page = new ListingPage(that, content_data);
      listing_page.generate();
    }
  });
};

module.exports = ContentManager;
