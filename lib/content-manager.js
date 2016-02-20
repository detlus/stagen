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

ContentManager.prototype.scanFiles = function() {
  var filesinfo = this.listDir('', '');
  fs.writeFileSync(path.join(this.site.getCacheDir(), 'fileinfo.json'), JSON.stringify(filesinfo), {encoding: 'utf8'} );
};

ContentManager.prototype.listDir = function(dir_name, parent) {
  var that = this;
  if (arguments.length > 2) {
    options = arguments[2];
  }
  else {
    options = {};
  }


  var root;
  if (options.root) {
    root = options.root;
  }
  else {
    root = this.site.getContentDir();
  }

  var current_path = path.join(root, parent, dir_name);
  var filenames = {};

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
      filenames[path.join(parent, dir_name, filename)] = _.pick(stat, ['size', 'atime', 'mtime', 'ctime', 'birthtime']);
    }
    else if (stat.isDirectory()) {
      // Go recursively to subdirectories.
      filenames = _.extend(filenames, that.listDir(filename, path.join(parent, dir_name), options));
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
  _.each(theme_assets, function(stat, filename){
    that.copyFile(path.join(theme_dir, filename), path.join(output_dir, filename));
  });
};

ContentManager.prototype.copyFile = function(source, destination) {
  mkdirp.sync(path.dirname(destination));
  var data = fs.readFileSync(source);
  fs.writeFileSync(destination, data);
};

ContentManager.prototype.generateOutput = function() {
  var that = this;
  var filesinfo = this.listDir('', '');
  var content_dir = this.site.getContentDir();

  _.each(filesinfo, function(stat, item ){
    // Consider only markdown files.
    if (['.md', '.markdown'].indexOf(path.extname(item)) > -1 ) {
      var file_path = path.join(content_dir, item);
      var data = fs.readFileSync(file_path, {encoding: 'utf8'});

      if (!data.length) {
        return;
      }

      var post_data;
      try {
        post_data = fm(data);
      }
      catch (e) {
        that.site.addError();
        console.log("Content read failed for " + item + ' (' + e + e.stack + ')');
        return;
      }

      var post = new stagen.Post(
        that.site,
        that,
        _.extend(
          {body: kramed(post_data.body), path: item},
          post_data.attributes
        )
      );
      try {
        post.generate();
      }
      catch(e) {
        that.site.addError();
        console.log("Content generation failed for " + item + ' (' + e + e.stack + ')');
      }
    }
  });
};

module.exports = ContentManager;
