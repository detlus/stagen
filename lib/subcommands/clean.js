var path = require('path');

var clean = function(options) {
  var pwd = options.s || options.source || process.cwd();
  var Site = require('../site');
  var ContentManager = require('../content-manager');


  var site = new Site(pwd);
  if (site.init()) {
    site.clean();
  }
  site.finalize();
};

module.exports = clean;
