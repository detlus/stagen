var yaml = require('js-yaml'),
  fs = require('fs'),
  util = require('util'),
  _ = require('underscore'),
  Twig = require('twig'),
  twig = Twig.twig,
  fm = require('front-matter'),
  kramed = require('kramed'),
  mkdirp = require('mkdirp'),
  path = require('path'),
  DataManager = require('../lib/data-manager');


var Site = function(path) {
  this.path = path;
  this.errors = [];
  this.init();
};

// Site class to create site object representing a site.
Site.prototype.init = function() {
  var that = this;
  var config_file_path = this.path + '/_config.yml';
  var config_exists = false;
  try {
      fs.accessSync(config_file_path, fs.F_OK);
      config_exists = true;
  } catch (e) {
      // It isn't accessible
  }
  if (!config_exists) {
    throw 'Configuration file (_config.yml) does not exist at ' + this.path;
  }

  this.configuration = _.extend(
    yaml.safeLoad(fs.readFileSync(config_file_path, 'utf8')),
    {
      output_dir: '_site',
      content_dir: '_content',
      cache_dir: '_cache',
      content_indexs: ['layout', 'category', 'tags', 'datetime']
    }
  );
  new DataManager(this);
  this.configuration.site.data = new DataManager(this).getData();
};

Site.prototype.getOutputDir = function() {
  return this.path + '/' + this.configuration.output_dir;
};

Site.prototype.getContentDir = function() {
  return path.join(this.path, this.configuration.content_dir);
};

Site.prototype.getCacheDir = function() {
  return path.join(this.path, this.configuration.cache_dir);
};

Site.prototype.getThemeDir = function() {
  return path.join(this.path, '_themes', this.configuration.theme);
};

Site.prototype.getDataDir = function() {
  return path.join(this.path, '_data');
};

Site.prototype.addError = function(message, exception) {
  return this.errors.push({message: message, exception: exception});
};

Site.prototype.finalize = function() {
  if (this.errors.length) {
    console.log(util.format("There occured %d errors.", this.errors.length));
    _.each(this.errors, function(item) {
      console.log(util.format("%s: %s", item.message, item.exception));
    });
  }
  console.log("Finalized generating output.");
};

/**
 * Removes all files from output directory.
 */
Site.prototype.clean = function() {
  var deleteFolderRecursive = require('../lib/util').deleteFolderRecursive;
  deleteFolderRecursive(this.getOutputDir());
  mkdirp(this.getOutputDir());
};

// Post class to create objects represnting posts.
var Post = function(content_manager, filename, options) {
  this.site = content_manager.site;
  this.content_manager = content_manager;
  // this.post = post;
  this.filename = filename;
  this.options = options | {};
  this.getContentData();
  if (this.post) {
    this.init();
  }
};

Post.prototype.init = function() {
  // Prepare permalink and output filename
  var path = require('path');
  if (!this.post.permalink) {
    this.post.permalink = this.post.path.substring(0, this.post.path.lastIndexOf('.')) + '.html';
    this.post.output_filename = this.post.permalink;
  }
  else if(this.post.permalink.charAt(this.post.permalink.length - 1) === '/') {
    this.post.output_filename = this.post.permalink + 'index.html';
  }
  else {
    this.post.output_filename = this.post.permalink;
  }

  // Prepare post datetime.
  var basefilename = path.parse(this.post.path).base;
  if (!this.post.datetime) {
    var filename_with_date_pattern = /^(\d{4}\-\d{2}\-\d{2})-.*/;
    if (this.post.date) {
      this.post.datetime = this.post.date;
    }
    else if (filename_with_date_pattern.test(basefilename)) {
      var date = new Date(filename_with_date_pattern.exec(basefilename)[1]);
      this.post.datetime = date;
    }
  }

  if (!this.post.excerpt) {
    // Why it does work for double lines? May be JS specific feature.
    this.post.excerpt = this.post.body.split(/[\r\n]/gm, 1)[0];
  }
};

Post.prototype.getData = function() {
  return this.post;
};

Post.prototype.isValid = function() {
  if (this.post) {
    return true;
  }
  else {
    return false;
  }
};

Post.theme_layouts = {};
Post.type_templates = {};

Post.prototype.render = function(mode) {
  var type_template;
  if (!Post.type_templates['post']) {
    type_template = this.site.getThemeDir() + '/_types/' + 'post' + '.twig';
    try{
      fs.statSync(type_template);
    }
    catch (e){
      throw new Error("The type template file " + 'post' + " does not exist in theme " + this.site.configuration.theme);
    }
    Post.type_templates['post'] = twig({
        id: 'type-' + 'post',
        path: type_template,
        async: false
    });
  }
  return Post.type_templates['post'].render({site: this.site.configuration.site, post: this.post, view_mode: mode});
};
/**
 * Generate the HTML output for the post and create HTML static file.
 */
Post.prototype.generate = function() {
  var path = require('path');

  var post_template;

  if (!Post.theme_layouts[this.post.layout ]) {
    post_template = this.site.getThemeDir() + '/_layouts/' + this.post.layout + '.twig';
    try{
      fs.statSync(post_template);
    }
    catch (e){
      throw new Error("The layout file " + this.post.layout + " does not exist in theme " + this.site.configuration.theme);
    }
    var template = twig({
        id: 'layout-' + this.post.layout,
        path: post_template,
        async: false
    });
    Post.theme_layouts[this.post.layout ] = template;
  }

  var type_html = this.render('full');
  var html = Post.theme_layouts[this.post.layout ].render({
    site: this.site.configuration.site,
    page: _.extend(this.post, {content: type_html})
  });
  var output_file_path = this.site.getOutputDir() + '/' + this.post.output_filename;
  mkdirp.sync(path.dirname(output_file_path));
  fs.writeFileSync(output_file_path, html, {encoding: 'utf8'} );
  this.content_manager.addOutput(this.post.path, this.post.output_filename);
};

Post.prototype.getContentData = function() {
  var file_path = path.join(this.content_manager.site.getContentDir(), this.filename);
  var data = fs.readFileSync(file_path, {encoding: 'utf8'});

  if (!data.length) {
    return;
  }

  var content_data;
  try {
    content_data = fm(data);
  }
  catch (e) {
    this.content_manager.site.addError("Content read failed for " + this.filename, e);
    return;
  }
  this.post =  _.extend(
    {body: kramed(content_data.body), path: this.filename},
    content_data.attributes
  );
};

module.exports = {
  Post: Post,
  Site: Site
};
