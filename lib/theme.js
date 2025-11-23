import { join } from 'path';
import fs from 'fs';
import LibraryManager from './library-manager.js';
import { fileExists, readYamlFile } from './util.js';
import { defaults } from 'underscore';

class Theme {
  constructor(name, site) {
    this.site = site;
    this.name = name;
    this.theme_dir = join(this.site.path, this.site.configuration.themes_dir, this.name);
    if (!fileExists(this.theme_dir)) {
      this.site.addError("Theme '" + this.name + "' does not exists.");
    }
    this.library_manager = new LibraryManager(this.site);
    this.library_manager.addLibraries(this.site.getLibraries());
    this.library_manager.addLibraries(this.getLibraries());
  }
  getInfo() {
    if (!this.info) {
      var theme_info_file = join(this.theme_dir, this.name + '.yml');
      this.info = defaults(readYamlFile(theme_info_file) || {}, {
        exclude: [],
        libraries: {}
      });
    }
    return this.info;
  }
  getLibraries() {
    var libraries_file = join(this.theme_dir, 'libraries.yml');
    return readYamlFile(libraries_file) || {};
  }
  /**
   * Read theme settings for this theme from site configuration.
   *
   * @return object
   */
  settings() {
    if (!this.theme_settings) {
      this.theme_settings = {};
      if (this.site.configuration.theme_settings && this.site.configuration.theme_settings[this.name]) {
        this.theme_settings = this.site.configuration.theme_settings[this.name];
      }
    }
    return this.theme_settings;
  }
}

export default Theme;
