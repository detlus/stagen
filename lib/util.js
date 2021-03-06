/*jslint node: true */
"use strict";

var fs = require('fs'),
  path = require('path'),
  _ = require('underscore'),
  fm = require('front-matter'),
  child_process = require('child_process'),
  yaml = require('js-yaml'),
  mkdirp = require('mkdirp');

var deleteFolderRecursive = function(filepath, keep_root) {
  if( fs.existsSync(filepath) ) {
    fs.readdirSync(filepath).forEach(function(file,index){
      var curPath = path.join(filepath, file);
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    if (!keep_root) {
      fs.rmdirSync(filepath);
    }
  }
};

var listDir = function(root, dir_name, parent, options) {
  options = _.defaults(options || {}, {});

  var current_path = path.join(root, parent, dir_name);
  var filenames = {};
  var current_path_exists = false;
  try{
    fs.statSync(current_path);
    current_path_exists = true;
  }
  catch (e){
  }
  if (!current_path_exists) {
    return filenames;
  }

  // Iterate over all files and directories under current path
  // to collect file info.
  _.each(fs.readdirSync(current_path), function(filename){
    var file_path = path.join(current_path, filename);
    var stat = fs.statSync(file_path);

    var filepath = path.join(parent, dir_name, filename);
    // If filter function is provided, then call it and decide whether to move
    // forward.
    if (options.filter && !options.filter(filepath, stat)) {
      return;
    }

    if (stat.isFile()) {
      // Keep only selected values from file stat.
      // To avoid oveusing of memory.
      filenames[filepath] = {
        filename: filepath,
        stat: _.pick(stat, ['size', 'atime', 'mtime', 'ctime', 'birthtime'])
      };
    }
    else if (stat.isDirectory()) {
      // Go recursively to subdirectories.
      _.each(listDir(root, filename, path.join(parent, dir_name), options), function(fileinfo, filename) {
        filenames[filename] = fileinfo;
      });
      // filenames = filenames.concat(listDir(root, filename, path.join(parent, dir_name), options));
    }
  });
  return filenames;
};

var getContentData = function(site, filename) {
  var file_path = path.join(site.getContentDir(), filename);
  var data = fs.readFileSync(file_path, {encoding: 'utf8'});

  if (!data.length) {
    return;
  }

  try {
    data = fm(data);
  }
  catch (e) {
    site.addError("Content read failed for " + filename, e);
    return;
  }

  var content_data = {
    path: filename,
  };

  if (['.md', '.markdown'].indexOf(path.extname(filename)) > -1) {
    var output = child_process.spawnSync(
      site.configuration.pandoc_path,
      [ '-f', 'markdown+abbreviations', '-t', 'html', '--highlight-style', 'pygments'],
      {
        input: data.body
      }
    );
    if (!output.error && output.stdout) {
      content_data.body = output.stdout.toString('utf-8');
    }
  }
  else {
    content_data.body = data.body;
  }
  return _.extend(content_data, data.attributes);
};

var isURLAbsolute = function(url) {
  var re = new RegExp("^(\\w+\:\/\/|mailto\:)", 'i');
  return re.test(url);
};

var readYamlFile = function(filepath) {
  var info = null;
  var file_exists = false;
  try{
    fs.statSync(filepath);
    file_exists = true;
  }
  catch (e){

  }
  if (file_exists) {
    try {
      // Read YAML data from the file.
      info = yaml.safeLoad(fs.readFileSync(filepath, 'utf8'));
    }
    catch (e) {

    }
  }
  return info;
};

var fileExists = function(path) {
  var file_exists = false;
  try{
    fs.statSync(path);
    file_exists = true;
  }
  catch (e){

  }
  return file_exists;
};

var copyFile = function(source, destination) {
  mkdirp.sync(path.dirname(destination));
  var data = fs.readFileSync(source);
  fs.writeFileSync(destination, data);
};

module.exports = {
  deleteFolderRecursive: deleteFolderRecursive,
  listDir: listDir,
  getContentData: getContentData,
  isURLAbsolute: isURLAbsolute,
  readYamlFile: readYamlFile,
  fileExists: fileExists,
  copyFile: copyFile
};
