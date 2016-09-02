
var serve = function(options) {
  var chokidar = require('chokidar');
  var path = require('path');

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
  }
  else {
    console.log('Site not initialized');
    return;
  }

  var watcher = chokidar.watch(pwd, {
    ignored:  [
      path.join(site.path, '.git'),
      path.join(site.path, '.cache'),
      path.join(site.path, 'site')
    ],
    persistent: true,
  });

  var log = console.log.bind(console);

  watcher
    // .on('add', function(path) { log('File', path, 'has been added'); })
    // .on('addDir', function(path) { log('Directory', path, 'has been added'); })
    .on('change', function(filepath) {
      relative_filepath = path.relative(site.path, filepath);
      log('File', relative_filepath, 'has been changed');
      var path_parts = relative_filepath.split(path.sep);
      if (path.join(site.path, path_parts[0]) == site.getContentDir()) {
        path_parts.shift();
        content_path = path_parts.join(path.sep);
        log('Generating output for', relative_filepath);
        cm.removeOutputFor(content_path, true);
        cm.generateSingleOutput(content_path, true);
      }
      else {
        // TODO: What to do with non-conent files.
      }

    })
    .on('unlink', function(filepath) {
      relative_filepath = path.relative(site.path, filepath);
      log('File', relative_filepath, 'has been removed');
      var path_parts = relative_filepath.split(path.sep);
      if (path.join(site.path, path_parts[0]) == site.getContentDir()) {
        path_parts.shift();
        content_path = path_parts.join(path.sep);
        log('Removing output(s) for', relative_filepath);
        cm.removeOutputFor(content_path, true);
      }
      else {
        // TODO: What to do with non-conent files.
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
