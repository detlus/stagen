var stagen_util = require('../../lib/util');

var ContentType = function(content_manager, filename, options) {
  this.content_manager = content_manager;
  this.filename = filename;
  this.options = options | {};
  this.data = stagen_util.getContentData(this.content_manager.site, filename);
  if (this.data) {
    this.init();
  }
};

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
