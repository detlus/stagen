  var path = require('path');

var getContentFilename = function(absolute_filepath, site) {
  relative_filepath = path.relative(site.path, absolute_filepath);
  var path_parts = relative_filepath.split(path.sep);
  if (path.join(site.path, path_parts[0]) == site.getContentDir()) {
    path_parts.shift();
    return path_parts.join(path.sep);
  }
  else {
    return false;
  }
};

var serve = function(options) {
  var chokidar = require('chokidar');

  var pwd = options.s || options.source || process.cwd();
  var Site = require('../site');
  var ContentManager = require('../content-manager');
  var site = new Site(pwd);
  if (site.init()) {
    if (options['content-all']) {
      site.setContentCriteria('published', 'any');
    }
    if (options['clean']) {
      site.clean();
    }
    var cm = new ContentManager(site);
    cm.registerType(require('../content-types/post'));
    cm.registerType(require('../content-types/listing-page'));
    cm.registerType(require('../content-types/page'));
    cm.registerType(require('../content-types/feed'));
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

  var watcher = chokidar.watch(pwd, {
    ignored:  [
      path.join(site.path, '.git'),
      path.join(site.path, '.cache'),
      path.join(site.path, 'site'),
      path.join(site.path, '.gitignore'),
      path.join(site.path, '.gitmodules')
    ],
    persistent: true,
    ignoreInitial: true
  });

  var log = console.log.bind(console);

  watcher
    .on('add', function(filepath) {
      // log('File', path, 'has been added');
      var content_path = getContentFilename(filepath, site);
      if (content_path) {
        log('Removing output(s) for', content_path);
        cm.generateSingleOutput(content_path);
      }
    })
    // .on('addDir', function(path) { log('Directory', path, 'has been added'); })
    .on('change', function(filepath) {
      var content_path = getContentFilename(filepath, site);
      if (content_path) {
        log('Generating output for', content_path);
        cm.generateSingleOutput(content_path, true);
      }

    })
    .on('unlink', function(filepath) {
      var content_path = getContentFilename(filepath, site);
      if (content_path) {
        log('Removing output(s) for', content_path);
        cm.cleanOutputForContent(content_path);
      }
    })
    .on('unlinkDir', function(filepath) { log('Directory', filepath, 'has been removed'); })
    .on('error', function(error) { log('Error happened', error); })
    .on('ready', function() { log('Initial scan complete. Ready for changes.'); })
    // .on('raw', function(event, path, details) { log('Raw event info:', event, path, details); })


  // Only needed if watching is `persistent: true`.
  // watcher.close();
};

module.exports = serve;
