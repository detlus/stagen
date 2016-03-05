/*jslint node: true */
"use strict";

var stagen_util = require('../util');

/**
 * Base class for all content type specifi classes to override.
 */
var ContentType = function(content_manager, filename, options) {
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
ContentType.prototype.init = function() {};

ContentType.prototype.getData = function() {
  return this.data;
};

ContentType.prototype.isValid = function() {
  if (this.data) {
    return true;
  }
  else {
    return false;
  }
};

module.exports = ContentType;
