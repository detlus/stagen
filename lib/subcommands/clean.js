var path = require('path');

var clean = function(options) {
  var pwd = options.s || options.source || process.cwd();
  var stagen = require('../site');
  var ContentManager = require('../content-manager');


  var site = new stagen.Site(pwd);
  if (site.init()) {
    site.clean();
  }
  site.finalize();
};

module.exports = clean;
