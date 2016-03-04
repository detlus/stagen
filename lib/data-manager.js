/*jslint node: true */
"use strict";

var _ = require('underscore'),
  path = require('path'),
  yaml = require('js-yaml'),
  fs = require('fs'),
  stagen_util = require('../lib/util');

var DataManager = function(site) {
  this.site = site;
  this.data_fetched = false;
  this.init();
};

DataManager.prototype.init = function() {
  var that = this;
  this.data = {};
  var data_dir = this.site.getDataDir();
  this.data_files = stagen_util.listDir(
    this.site,
    '', '',
    {
      root: data_dir,
    }
  );
  _.each(this.data_files, function(item, index) {
    var path_info = path.parse(item.filename);
    // Remove file extension
    path_info.ext = '';
    path_info.base = path_info.name;
    that.data_files[index].datapath = path.format(path_info).replace('/', '.');
  });
};

DataManager.prototype.getData = function() {
  var that = this;
  if (!this.data_fetched) {
    var data_dir = this.site.getDataDir();
    _.each(this.data_files, function(item, index) {
      var data;
      try {
        data = yaml.safeLoad(fs.readFileSync(path.join(data_dir, item.filename), 'utf8'));
      } catch (e) {
        that.site.addError("Processing data file " + item.filename + " failed", e);
        return;
      }
      that._assign(item.datapath, data);
    });
  }
  return this.data;
};

DataManager.prototype._assign = function(data_path, value) {
  var path_parts = data_path.split('.');
  var obj = this.data;

  _.each(path_parts, function(item, index) {
    if (index < path_parts.length - 1) {
      if (_.isUndefined(obj[item])) {
        obj[item] = {};
      }
      obj = obj[item];
    }
    else {
      obj[item] = value;
    }
  });
};


module.exports = DataManager;
