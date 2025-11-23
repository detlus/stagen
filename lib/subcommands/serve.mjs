import { relative, sep, join } from 'path';

import Site from '../site.js';
import ContentManager from '../content-manager.js';
import Post from '../content-types/post.js';
import ListingPage from '../content-types/listing-page.js';
import Page from '../content-types/page.js';
import Feed from '../content-types/feed.js';
import { createServer } from 'http';
import ecstatic from 'ecstatic';
import { watch } from 'chokidar';

var getContentFilename = function(absolute_filepath, site) {
  relative_filepath = relative(site.path, absolute_filepath);
  var path_parts = relative_filepath.split(sep);
  if (join(site.path, path_parts[0]) == site.getContentDir()) {
    path_parts.shift();
    return path_parts.join(sep);
  }
  else {
    return false;
  }
};

export function command(options) {

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
  }
  else {
    console.log('Site not initialized');
    return;
  }

  if (process.platform === "win32") {
    var rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on("SIGINT", function () {
      process.emit("SIGINT");
    });
  }

  process.on("SIGINT", function () {
    cm.writeMetadata();
    site.finalize();
    //graceful shutdown
    process.exit();
  });

  if (options.nowatch) {
    console.log("Just serving without watching over changes.");
  }

  var server = createServer (
    ecstatic({
      root: site.getOutputDir(),
      robots: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  );
  var port = options.port || 8080;
  var host = options.host || '0.0.0.0';
  server.listen(port, host, function () {
    console.log("Starting HTTP server. Serving http://" + host + ":" + port + "/");
    console.log("Hit CTRL-C to stop the server.");
  });

  if (!options.nowatch) {

    var watcher = watch(pwd, {
      ignored: [
        join(site.path, '.git'),
        join(site.path, '.cache'),
        join(site.path, 'site'),
        join(site.path, '.gitignore'),
        join(site.path, '.gitmodules'),
        join(site.path, 'node_modules')
      ],
      persistent: true,
      ignoreInitial: true
    });

    var log = console.log.bind(console);

    watcher
      .on('add', function (filepath) {
        // log('File', path, 'has been added');
        var content_path = getContentFilename(filepath, site);
        if (content_path) {
          log('Removing output(s) for', content_path);
          cm.generateSingleOutput(content_path);
        }
      })
      // .on('addDir', function(path) { log('Directory', path, 'has been added'); })
      .on('change', function (filepath) {
        var content_path = getContentFilename(filepath, site);
        if (content_path) {
          log('Generating output for', content_path);
          cm.generateSingleOutput(content_path, true);
        }

      })
      .on('unlink', function (filepath) {
        var content_path = getContentFilename(filepath, site);
        if (content_path) {
          log('Removing output(s) for', content_path);
          cm.cleanOutputForContent(content_path);
        }
      })
      .on('unlinkDir', function (filepath) { log('Directory', filepath, 'has been removed'); })
      .on('error', function (error) { log('Error happened', error); })
      .on('ready', function () { log('Initial scan complete. Ready for changes.'); });
    // .on('raw', function(event, path, details) { log('Raw event info:', event, path, details); })
    // Only needed if watching is `persistent: true`.
    // watcher.close();
  }
}

