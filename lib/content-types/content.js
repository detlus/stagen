/*jslint node: true */
"use strict";

var stagen_util = require('../util'),
  TemplateManager = require('../template-manager'),
  _ = require('underscore');

/**
 * Base class for all content type specifi classes to override.
 */
var Content = function(content_manager, filename, options) {
  this.content_manager = content_manager;
  this.filename = filename;
  this.options = options | {};
  this.data = stagen_util.getContentData(this.content_manager.site, filename);
  if (this.data) {
    this.data = _.defaults(this.data, {published: true});
    this.init();
  }
};

/**
 * Sub classes need to override method to perform required initialization.
 */
Content.prototype.init = function() {};

Content.prototype.getData = function() {
  return this.data;
};

Content.prototype.isCriteriaPass = function() {
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
};

Content.prototype.isValid = function() {
  if (this.data && this.isCriteriaPass()) {
    return true;
  }
  else {
    return false;
  }
};

Content.prototype.getTemplateSuggestions = function() {
  return [];
};

Content.prototype.getTypeTemplate = function(type) {
  var tm = new TemplateManager(this.content_manager.site);
  var type_template = tm.getTypeTemplate(type, this.getTemplateSuggestions());
  if (!type_template) {
    type_template = this.getDefaultTemplate();
  }
  return type_template;
};

module.exports = Content;
