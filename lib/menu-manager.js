import Menu from './menu.js';

class MenuManager {
  constructor(site) {
    this.site = site;
  }
  print(name, suggestion) {
    var menu = new Menu(this.site, name);
    if (menu.isValid()) {
      return menu.render(suggestion);
    }
    else {
      return 'invalid';
    }
  }
}


export default MenuManager;
