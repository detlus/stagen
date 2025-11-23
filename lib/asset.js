/*jslint node: true */
"use strict";

var stagen_util = require('../util'),
  _ = require('underscore');

/**
 * Base class for all content type specifi classes to override.
 */
var Asset = function(content_manager, filename) {
  this.content_manager = content_manager;
  this.filename = filename;
};

/**
 * Sub classes need to override method to perform required initialization.
 */
Asset.prototype.init = function() {};

Asset.prototype.isValid = function() {
  return true;
};

Asset.prototype.getTypeTemplate = function(type) {
  var tm = this.content_manager.site.getTemplateManager();
  var type_template = tm.getTypeTemplate(type, this.getTemplateSuggestions());
  if (!type_template) {
    type_template = this.getDefaultTemplate();
  }
  return type_template;
};

module.exports = Asset;
