var yaml = require('js-yaml'),
  fs = require('fs'),
  util = require('util'),
  _ = require('underscore'),
  Twig = require('twig'),
  twig = Twig.twig,
  fm = require('front-matter'),
  kramed = require('kramed'),
  mkdirp = require('mkdirp'),
  path = require('path');


var Site = function(path) {
  this.path = path;
  this.errors = 0;
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

Site.prototype.addError = function() {
  return this.errors++;
};

Site.prototype.finalize = function() {
  if (this.errors) {
    console.log(util.format("There occured %d errors.", this.errors));
  }
  console.log("Finalized generating output.");
};

// Post class to create objects represnting posts.
var Post = function(content_manager, post, options) {
  this.site = content_manager.site;
  this.content_manager = content_manager;
  this.post = post;
  this.options = options | {};

  this.init();
};

Post.prototype.init = function() {
  var path = require('path');
  if (!this.post.permalink) {
    this.post.permalink = this.post.path.substring(0, this.post.path.lastIndexOf('.'));
  }
  else if(this.post.permalink.charAt(this.post.permalink.length - 1) === '/') {
    this.post.permalink = this.post.permalink + 'index';
  }

  var extension = path.extname(this.post.permalink);
  if (extension === '.' || extension === '') {
    this.post.permalink = this.post.permalink + '.html';
  }
};

Post.prototype.getData = function() {
  return this.post;
};

Post.theme_layouts = {};
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
        id: 'post',
        path: post_template,
        async: false
    });
    Post.theme_layouts[this.post.layout ] = template;
  }

  var html = Post.theme_layouts[this.post.layout ].render({site: this.site.configuration.site, post: this.post});
  var output_file_path = this.site.getOutputDir() + '/' + this.post.permalink;
  mkdirp.sync(path.dirname(output_file_path));
  fs.writeFileSync(output_file_path, html, {encoding: 'utf8'} );
  this.content_manager.addOutput(this.post.path, this.post.permalink);
};

module.exports = {
  Post: Post,
  Site: Site
};
