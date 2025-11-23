/*jslint node: true */
"use strict";

import { getContentData } from '../util.js';
import { defaults } from 'underscore';
import LibraryManager from '../library-manager.js';
import { sep } from 'path';

/**
 * Base class for all content type specifi classes to override.
 */
class Content {
  constructor(content_manager, filename, options) {
    console.log(filename);
    this.content_manager = content_manager;
    this.filename = filename;
    var type_plural = filename.split(sep, 1)[0];
    this.type = type_plural.substring(0, type_plural.length - 1);
    this.options = options | {};
    this.data = getContentData(this.content_manager.site, filename);
    if (this.data) {
      this.data = defaults(this.data, { published: true });
      this.init();
    }
  }
  /**
   * Sub classes need to override method to perform required initialization.
   */
  init() { }
  getData() {
    return this.data;
  }
  isCriteriaPass() {
    var cc = this.content_manager.site.configuration.content_criteria;
    for (let property in cc) {
      switch (property) {
        case 'published':
          if (cc[property] !== 'any' && this.data[property] !== cc[property]) {
            return false;
          }
          break;
      }
    }
    return true;
  }
  isValid() {
    if (this.data && this.isCriteriaPass()) {
      return true;
    }
    else {
      return false;
    }
  }
  getTemplateSuggestions() {
    return [];
  }
  getTypeTemplate(type) {
    var tm = this.content_manager.site.getTemplateManager();
    var type_template = tm.getTypeTemplate(type, this.getTemplateSuggestions());
    if (!type_template) {
      type_template = this.getDefaultTemplate();
    }
    return type_template;
  }
  getLibraryNamesToLoad() {
    if (!this.libraries) {
      this.libraries = [];
      this.libraries = this.libraries.concat(this.content_manager.site.configuration.libraries || []);
      this.libraries = this.libraries.concat(this.content_manager.site.default_theme.getInfo().libraries || []);
      this.libraries = this.libraries.concat(this.data.libraries || []);
    }
    return this.libraries;
  }
  getHead() {
    return this.content_manager.site.default_theme.library_manager.print(this.getLibraryNamesToLoad(), 'head');
  }
  getFooter() {
    return this.content_manager.site.default_theme.library_manager.print(this.getLibraryNamesToLoad(), 'footer');
  }
}


export default Content;
