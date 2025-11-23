import { check_requirements } from '../requirements.mjs'
import Site from '../site.js';
import ContentManager from '../content-manager.js';

export async function command(options) {

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

    const dir = new URL('../content-types/', import.meta.url);
    await cm.discoverTypes(dir);
    
    cm.generateOutput();
    cm.writeMetadata();
    site.copyThemeAssets();
    site.copyAssets();
  }
  site.finalize();
}

// module.exports = build;
