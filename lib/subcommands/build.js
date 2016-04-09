var path = require('path');

var build = function(options) {
  var pwd = options.s || options.source || process.cwd();
  var Site = require('../site');
  var ContentManager = require('../content-manager');


  var site = new Site(pwd);
  if (site.init()) {
    if (options['content-all']) {
      site.setContentCriteria('published', 'any');
    }
    site.clean();
    var cm = new ContentManager(site);
    cm.registerType(require('../content-types/post'));
    cm.registerType(require('../content-types/listing-page'));
    cm.registerType(require('../content-types/page'));
    cm.registerType(require('../content-types/feed'));
    cm.generateOutput();
    cm.copyThemeAssets();
    cm.copyAssets();
  }
  site.finalize();
};

module.exports = build;
