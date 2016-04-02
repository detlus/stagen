var fs = require('fs'),
  path = require('path'),
  yaml = require('js-yaml'),
  _ = require('underscore');

var Menu = function(site, name) {
  this.site = site;
  this.name = name;
  var menu_file_path = path.join(this.site.getContentDir(), 'menus', name + '.yml');
  var menu_exists = true;
  try {
    fs.accessSync(menu_file_path, fs.F_OK);
  } catch (e) {
    // It isn't accessible
    this.site.addError("Menu file " + name + " does not exists", e);
    menu_exists = false;
  }
  if (menu_exists) {
    try {
      // Read YAML data from the file.
      this.data = yaml.safeLoad(fs.readFileSync(menu_file_path, 'utf8'));
    } catch (e) {
      this.site.addError("Processing menu file " + name + " failed", e);
    }
  }
};

Menu.prototype.isValid = function() {
  return !_.isUndefined(this.data) && !_.isNull(this.data);
};

Menu.prototype.render = function() {
  var tm = this.site.getTemplateManager();
  var menu_template = tm.getMenuTemplate(['menu--' + this.name]);
  return menu_template.render({site: this.site.configuration.site, menu: this.data});
};

Menu.load = function(name, site) {

};

module.exports = Menu;
