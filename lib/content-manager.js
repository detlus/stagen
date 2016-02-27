/*jslint node: true */
"use strict";

var _ = require('underscore'),
  fs = require('fs'),
  path = require('path'),
  fm = require('front-matter'),
  stagen = require('../lib/stagen'),
  kramed = require('kramed'),
  mkdirp = require('mkdirp');


var ContentManager = function(site) {
  this.site = site;
  this.output_map = {};
};

ContentManager.prototype.scanFiles = function(type) {
  var that = this;
  var filesinfo = this.listDir(type + 's', '');
  var content_dir = this.site.getContentDir();
  _.each(filesinfo, function(fileinfo, index) {
    var file_path = path.join(content_dir, fileinfo.filename);
    var data = fs.readFileSync(file_path, {encoding: 'utf8'});
    var fm_data;
    try {
      fm_data = fm(data);
    }
    catch (e) {
      that.site.addError();
      console.log("Front matter read failed for " + fileinfo.filename + ' (' + e + e.stack + ')');
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

ContentManager.prototype.listDir = function(dir_name, parent, options) {
  var that = this;
  options = _.defaults(options || {}, {root: this.site.getContentDir()});

  var current_path = path.join(options.root, parent, dir_name);
  var filenames = [];

  // Iterate over all files and directories under current path
  // to collect file info.
  _.each(fs.readdirSync(current_path), function(filename){
    var file_path = path.join(current_path, filename);
    var stat = fs.statSync(file_path);

    // If filter function is provided, then call it and decide whether to move
    // forward.
    if (options.filter && !options.filter(filename, stat)) {
      return;
    }

    if (stat.isFile()) {
      // Keep only selected values from file stat.
      // To avoid oveusing of memory.
      filenames.push({
        filename: path.join(parent, dir_name, filename),
        stat: _.pick(stat, ['size', 'atime', 'mtime', 'ctime', 'birthtime'])
      });
    }
    else if (stat.isDirectory()) {
      // Go recursively to subdirectories.
      filenames = filenames.concat(that.listDir(filename, path.join(parent, dir_name), options));
    }
  });
  return filenames;
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

  var theme_assets = this.listDir(
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
    this.site.addError();
    console.log("Content read failed for " + filename + ' (' + e + e.stack + ')');
    return;
  }
  return _.extend(
    {body: kramed(content_data.body), path: filename},
    content_data.attributes
  );
};

ContentManager.prototype.generateOutput = function() {
  var that = this;
  var filesinfo = this.listDir('', '');

  _.each(filesinfo, function(fileinfo, item ){
    // Consider only markdown files.
    if (['.md', '.markdown'].indexOf(path.extname(fileinfo.filename)) > -1 ) {

      var post = new stagen.Post(
        that,
        that.getContentData(fileinfo.filename)
      );
      try {
        post.generate();
      }
      catch(e) {
        that.site.addError();
        console.log("Content generation failed for " + fileinfo.filename + ' (' + e + e.stack + ')');
      }
    }
  });
};

ContentManager.prototype.generateListingPages = function() {
  var that = this;
  var filesinfo = this.listDir('listings', '');
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
        that.site.addError();
        console.log("Content read failed for " + fileinfo.filename + ' (' + e + e.stack + ')');
        return;
      }
      if (!content_data.attributes.listing_item) {
        that.site.addError();
        console.log("Listing item does not specified in " + fileinfo.filename);
        return;
      }
      content_data.path = fileinfo.filename;

      var listing_page = new ListingPage(that, content_data);
      listing_page.generate();
    }
  });
};

module.exports = ContentManager;
