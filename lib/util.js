/*jslint node: true */
"use strict";

import { existsSync, readdirSync, lstatSync, unlinkSync, rmdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, extname, dirname } from 'path';
import { defaults, each, pick, extend } from 'underscore';
import fm from 'front-matter';
import { spawnSync } from 'child_process';
import yaml from 'js-yaml';
import mkdirp from 'mkdirp';

export function deleteFolderRecursive(filepath, keep_root) {
  if (existsSync(filepath)) {
    readdirSync(filepath).forEach(function (file, index) {
      var curPath = join(filepath, file);
      if (lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        unlinkSync(curPath);
      }
    });
    if (!keep_root) {
      rmdirSync(filepath);
    }
  }
}

export function listDir(root, dir_name, parent, options) {
  options = defaults(options || {}, {});

  var current_path = join(root, parent, dir_name);
  var filenames = {};
  var current_path_exists = false;
  try {
    statSync(current_path);
    current_path_exists = true;
  }
  catch (e) {
  }
  if (!current_path_exists) {
    return filenames;
  }

  // Iterate over all files and directories under current path
  // to collect file info.
  each(readdirSync(current_path), function (filename) {
    var file_path = join(current_path, filename);
    var stat = statSync(file_path);

    var filepath = join(parent, dir_name, filename);
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
        stat: pick(stat, ['size', 'atime', 'mtime', 'ctime', 'birthtime'])
      };
    }
    else if (stat.isDirectory()) {
      // Go recursively to subdirectories.
      each(listDir(root, filename, join(parent, dir_name), options), function (fileinfo, filename) {
        filenames[filename] = fileinfo;
      });
      // filenames = filenames.concat(listDir(root, filename, path.join(parent, dir_name), options));
    }
  });
  return filenames;
}

export function getContentData(site, filename) {
  var file_path = join(site.getContentDir(), filename);
  var data = readFileSync(file_path, { encoding: 'utf8' });

  if (!data.length) {
    return;
  }

  try {
    // Process Front-Matter
    data = fm(data);
  }
  catch (e) {
    site.addError("Content read failed for " + filename, e);
    return;
  }

  var content_data = {
    path: filename,
  };

  if (['.md', '.markdown'].indexOf(extname(filename)) > -1) {
    var output = spawnSync(
      site.configuration.pandoc_path,
      ['-f', 'markdown+abbreviations', '-t', 'html', '--highlight-style', 'pygments', '--wrap', 'none'],
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
  return extend(content_data, data.attributes);
}

export function isURLAbsolute(url) {
  var re = new RegExp("^(\\w+\:\/\/|mailto\:)", 'i');
  return re.test(url);
}

export function readYamlFile(filepath) {
  var info = null;
  var file_exists = false;
  try {
    statSync(filepath);
    file_exists = true;
  }
  catch (e) {
  }
  if (file_exists) {
    try {
      // Read YAML data from the file.
      info = yaml.load(readFileSync(filepath, 'utf8'));
    }
    catch (e) {
    }
  }
  return info;
}

export function fileExists(path) {
  var file_exists = false;
  try {
    statSync(path);
    file_exists = true;
  }
  catch (e) {
  }
  return file_exists;
}

export function copyFile(source, destination) {
  mkdirp.sync(dirname(destination));
  var data = readFileSync(source);
  writeFileSync(destination, data);
}
