var Menu = require('./menu');

var MenuManager = function(site) {
  this.site = site;
};

MenuManager.prototype.print = function(name, suggestion) {
  var menu = new Menu(this.site, name);
  if (menu.isValid()) {
    return menu.render(suggestion);
  }
  else {
    return 'invalid';
  }
};

module.exports = MenuManager;
