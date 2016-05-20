var _ = require('underscore'),
  stagen_util = require('./util');

var LibraryManager = function(site) {
  this.site = site;
  this.base_url = site.configuration.site.baseurl;
  this.libraries = new Map();
};

LibraryManager.prototype.add = function(name, library) {
  library.name = name;
  this.libraries.set(name, library);
  delete this.sorted;
};

LibraryManager.prototype.addLibraries = function(libraries) {
  var that = this;
  _.each(libraries, function(library, name) {
    that.add(name, library);
  });
};

LibraryManager.prototype.getSorted = function(library_names) {
  var that = this;
  var libraries_copy = new Map(this.libraries.entries());
  var sorted = [];
  _.each(library_names, function(library_name) {
    if (typeof library_name !== 'string') {
      that.site.addError("Libray name should be string.");
      return;
    }
    var library = libraries_copy.get(library_name);
    if (library) {
      libraries_copy.delete(library_name);
      that.putItemInOrder(library, sorted, libraries_copy);
    }
    else {
      that.site.addError("Library '" + library_name + "' is not defined.'");
    }
  });
  return sorted;
};

LibraryManager.prototype.putItemInOrder = function(library, ordered, source) {
  var keys = source.keys();
  var that = this;
  if (library.dependecies) {
    _.each(library.dependecies, function(dependent) {
      var dependent_library = source.get(dependent);
      if (dependent_library) {
        source.delete(dependent);
        that.putItemInOrder(dependent_library, ordered, source);
      }
    });
  }
  ordered.push(library);
};

LibraryManager.prototype.print = function(library_names, scope) {
  var that = this;
  var output = '';
  var sorted = this.getSorted(library_names);
  _.each(sorted, function(library) {
    _.each(library.css, function(css_info){
      if (scope === 'head' && css_info.url) {
        var url = css_info.url;
        if (!stagen_util.isURLAbsolute(css_info.url)) {
          url = that.base_url + css_info.url
        }
        output += '<link rel="stylesheet" href="' + url + '">\n';
      }
    });
    _.each(library.js, function(js_info){
      if (js_info.scope === scope || (scope === 'footer' && !js_info.scope)) {
        if ((!js_info.type || js_info.type === 'file') && js_info.url) {
          var url = js_info.url;
          if (!stagen_util.isURLAbsolute(js_info.url)) {
            url = that.base_url + js_info.url;
          }
          output += '<script src="' + url + '"></script>\n';
        }
        else if (js_info.type === 'inline' && js_info.data) {
          output += '<script>' + js_info.data + '</script>\n';
        }
      }
    });
  });
  return output;
};

module.exports = LibraryManager;
