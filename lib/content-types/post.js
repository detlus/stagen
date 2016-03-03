var path = require('path'),
  fs = require('fs'),
  Twig = require('twig'),
  twig = Twig.twig,
  _ = require('underscore'),
  mkdirp = require('mkdirp'),
  stagen_util = require('../../lib/util');

// Post class to create objects represnting posts.
var Post = function(content_manager, filename, options) {
  this.site = content_manager.site;
  this.content_manager = content_manager;
  // this.post = post;
  this.filename = filename;
  this.options = options | {};
  this.post = stagen_util.getContentData(this.site, filename);
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

module.exports = Post;
