import path from 'path';
import Site from '../site.js';
// import ContentManager from '../content-manager';

export function command(options) {
  var pwd = options.s || options.source || process.cwd();
  // var Site = require('../site');
  // var ContentManager = require('../content-manager');


  var site = new Site(pwd);
  if (site.init()) {
    site.clean();
  }
  site.finalize();
}

