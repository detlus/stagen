import { accessSync, F_OK, readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { each, isUndefined, isNull } from 'underscore';
import { isURLAbsolute } from './util.js';

class Menu {
  constructor(site, name) {
    this.site = site;
    this.name = name;
    var menu_file_path = join(this.site.path, 'menus', name + '.yml');
    var menu_exists = true;
    try {
      accessSync(menu_file_path, F_OK);
    } catch (e) {
      // It isn't accessible
      this.site.addError("Menu file " + name + " does not exists", e);
      menu_exists = false;
    }
    if (menu_exists) {
      try {
        // Read YAML data from the file.
        this.data = yaml.load(readFileSync(menu_file_path, 'utf8'));
        this._normalize();
      } catch (e) {
        this.site.addError("Processing menu file " + name + " failed", e);
      }
    }
  }
  static load(name, site) {
  }
  _normalize() {
    if (this.data.items) {
      var that = this;
      each(this.data.items, function (item, index) {
        if (!isURLAbsolute(item.href)) {
          if (!item.href) {
            item.href = that.site.configuration.site.baseurl;
          }
          else if (item.href.length && item.href[0] !== '/') {
            item.href = that.site.configuration.site.baseurl + item.href;
          }
        }
      });
    }
  }
  isValid() {
    return !isUndefined(this.data) && !isNull(this.data);
  }
  render(suggestion) {
    var tm = this.site.getTemplateManager();
    var menu_template = tm.getMenuTemplate([suggestion, 'menu--' + this.name]);
    if (!menu_template) {
      menu_template = this.getDefaultTemplate();
    }
    return menu_template.render({
      site: this.site.configuration.site,
      menu: this.data,
      theme: this.site.default_theme
    });
  }
  getDefaultTemplate() {
    var template_string = '<nav>\
    <h2>{{ menu.title }}</h2>\
    <ul>\
      {% for item in menu.items %}\
        {% if item.title %}\
          {% if item.external %}\
            {% set linkurl = item.href %}\
          {% else %}\
            {% set linkurl = site.baseurl ~ item.href %}\
          {% endif %}\
          <li><a href="{{ linkurl }}">{{ item.title }}</a></li>\
        {% endif %}\
      {% endfor %}\
    </ul>\
    </nav>\
  ';
    return twig({
      data: template_string,
      async: false
    });
  }
}


export default Menu;
