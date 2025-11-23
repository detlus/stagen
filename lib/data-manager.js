/*jslint node: true */
"use strict";

import { each, isUndefined } from 'underscore';
import { parse, format, join } from 'path';
import yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { listDir } from './util.js';

class DataManager {
  constructor(site) {
    this.site = site;
    this.data_fetched = false;
    this.init();
  }
  /**
   * Prepare the list of data files in site.
   */
  init() {
    var that = this;
    this.data = {};
    var data_dir = this.site.getDataDir();
    this.data_files = listDir(
      data_dir,
      '', ''
    );
    each(this.data_files, function (item, index) {
      var path_info = parse(item.filename);
      // Remove file extension
      path_info.ext = '';
      path_info.base = path_info.name;
      that.data_files[index].datapath = format(path_info).replace('/', '.');
    });
  }
  /**
   * Read site data files and prepare the data property for the site.
   * So templates can utilize those data.
   */
  getData() {
    var that = this;
    if (!this.data_fetched) {
      var data_dir = this.site.getDataDir();
      each(this.data_files, function (item, index) {
        var data;
        try {
          // Read YAML data from the file.
          data = yaml.load(readFileSync(join(data_dir, item.filename), 'utf8'));
        } catch (e) {
          that.site.addError("Processing data file " + item.filename + " failed", e);
          return;
        }
        // Put the data in correct heirarchy, in data object.
        // data file path determines the nested property path.
        that._assign(item.datapath, data);
      });
    }
    return this.data;
  }
  _assign(data_path, value) {
    var path_parts = data_path.split('.');
    var obj = this.data;

    each(path_parts, function (item, index) {
      if (index < path_parts.length - 1) {
        if (isUndefined(obj[item])) {
          obj[item] = {};
        }
        obj = obj[item];
      }
      else {
        obj[item] = value;
      }
    });
  }
}


export default DataManager;
