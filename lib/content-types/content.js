/*jslint node: true */
"use strict";

var stagen_util = require('../util'),
  TemplateManager = require('../template-manager');

/**
 * Base class for all content type specifi classes to override.
 */
var Content = function(content_manager, filename, options) {
  this.content_manager = content_manager;
  this.filename = filename;
  this.options = options | {};
  this.data = stagen_util.getContentData(this.content_manager.site, filename);
  if (this.data) {
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

Content.prototype.isValid = function() {
  if (this.data) {
    return true;
  }
  else {
    return false;
  }
};

Content.prototype.getTypeTemplate = function(type) {
  var tm = new TemplateManager(this.content_manager.site);
  var type_template = tm.getTypeTemplate(type);
  if (!type_template) {
    type_template = this.getDefaultTemplate();
  }
  return type_template;
};

module.exports = Content;
