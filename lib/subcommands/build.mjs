// var path = require('path');
import path from 'path';
import { check_requirements } from '../requirements.mjs'
import Site from '../site.js';
import ContentManager from '../content-manager.js';
import Post from '../content-types/post.js';
import ListingPage from '../content-types/listing-page.js';
import Page from '../content-types/page.js';
import Feed from '../content-types/feed.js';

export function command(options) {

  if (!check_requirements()) {
    return;
  }
  var pwd = options.s || options.source || process.cwd();


  var site = new Site(pwd);
  if (site.init()) {
    if (options['content-all']) {
      site.setContentCriteria('published', 'any');
    }
    if (options['clean']) {
      site.clean();
    }
    var cm = new ContentManager(site);
    cm.registerType(Post);
    cm.registerType(ListingPage);
    cm.registerType(Page);
    cm.registerType(Feed);
    cm.generateOutput();
    cm.writeMetadata();
    site.copyThemeAssets();
    site.copyAssets();
  }
  site.finalize();
}

// module.exports = build;
