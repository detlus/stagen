var _ = require('underscore'),
  stagen_util = require('./util');

var LibraryManager = function(site, libraries) {
  this.site = site;
  // this.libraries = [];
  this.libraries = new Map();
  this.addLibraries(this.site.getThemeInfo().libraries);
  this.addLibraries(this.site.configuration.libraries);
  if (libraries) {
    this.addLibraries(libraries);
  }
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

LibraryManager.prototype.getSorted = function() {
  var libraries_copy = new Map(this.libraries.entries());
  if (!this.sorted && this.libraries.size) {
    this.sorted = [];
    var library_name;
    while(library_name = libraries_copy.keys().next().value) {
      var library = libraries_copy.get(library_name);
      libraries_copy.delete(library_name);
      this.putItemInOrder(library, this.sorted, libraries_copy);
    }
  }
  return this.sorted;
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

LibraryManager.prototype.print = function(scope) {
  var that = this;
  var output = '';
  var sorted = this.getSorted();
  _.each(sorted, function(library) {
    _.each(library.css, function(css_info){
      if (scope === 'head' && css_info.url) {
        var url = css_info.url;
        if (!stagen_util.isURLAbsolute(css_info.url)) {
          url = that.site.configuration.site.baseurl + css_info.url
        }
        output += '<link rel="stylesheet" href="' + url + '">\n';
      }
    });
    _.each(library.js, function(js_info){
      if (js_info.scope === scope || (scope === 'footer' && !js_info.scope)) {
        if ((!js_info.type || js_info.type === 'file') && js_info.url) {
          var url = js_info.url;
          if (!stagen_util.isURLAbsolute(js_info.url)) {
            url = that.site.configuration.site.baseurl + js_info.url;
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
