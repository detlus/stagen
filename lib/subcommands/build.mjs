import { check_requirements } from '../requirements.mjs'
import Site from '../site.js';
import ContentManager from '../content-manager.js';

import { join } from 'node:path';
import { readdirSync } from 'node:fs';

const dir = new URL('../content-types/', import.meta.url); // example directory

const types = [];

for (const file of readdirSync(dir)) {
  if (!file.endsWith('.js')) continue; // filter if needed
  const path = join(dir.pathname, file);
  const type = await import(path);
  types.push(type.default);
}

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
    types.forEach ( type => {
      cm.registerType(type);
    })
    
    cm.generateOutput();
    cm.writeMetadata();
    site.copyThemeAssets();
    site.copyAssets();
  }
  site.finalize();
}

// module.exports = build;
