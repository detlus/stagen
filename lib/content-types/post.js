/*jslint node: true */
"use strict";

var path = require('path'),
  fs = require('fs'),
  Twig = require('twig'),
  twig = Twig.twig,
  _ = require('underscore'),
  mkdirp = require('mkdirp'),
  stagen_util = require('../../lib/util'),
  util = require('util'),
  ContentType = require('./content-type');

// Post class to create objects represnting posts.
var Post = function(content_manager, filename, options) {
  // Call super constructor
  ContentType.call(this, content_manager, filename, options);
};

util.inherits(Post, ContentType);

Post.prototype.init = function() {
  // Prepare permalink and output filename
  var path = require('path');
  if (!this.data.permalink) {
    this.data.permalink = this.data.path.substring(0, this.data.path.lastIndexOf('.')) + '.html';
    this.data.output_filename = this.data.permalink;
  }
  else if(this.data.permalink.charAt(this.data.permalink.length - 1) === '/') {
    this.data.output_filename = this.data.permalink + 'index.html';
  }
  else {
    this.data.output_filename = this.data.permalink;
  }

  // Prepare post datetime.
  var basefilename = path.parse(this.data.path).base;
  if (!this.data.datetime) {
    var filename_with_date_pattern = /^(\d{4}\-\d{2}\-\d{2})-.*/;
    if (this.data.date) {
      this.data.datetime = this.data.date;
    }
    else if (filename_with_date_pattern.test(basefilename)) {
      var date = new Date(filename_with_date_pattern.exec(basefilename)[1]);
      this.data.datetime = date;
    }
  }

  if (!this.data.excerpt) {
    // Why it does work for double lines? May be JS specific feature.
    this.data.excerpt = this.data.body.split(/[\r\n]/gm, 1)[0];
  }
};

Post.theme_layouts = {};
Post.type_templates = {};

Post.prototype.render = function(mode) {
  var type_template;
  if (!Post.type_templates['post']) {
    type_template = this.content_manager.site.getThemeDir() + '/_types/' + 'post' + '.twig';
    try{
      fs.statSync(type_template);
    }
    catch (e){
      throw new Error("The type template file " + 'post' + " does not exist in theme " + this.content_manager.site.configuration.theme);
    }
    Post.type_templates['post'] = twig({
        id: 'type-' + 'post',
        path: type_template,
        async: false
    });
  }
  return Post.type_templates['post'].render({site: this.content_manager.site.configuration.site, post: this.data, view_mode: mode});
};
/**
 * Generate the HTML output for the post and create HTML static file.
 */
Post.prototype.generate = function() {
  var path = require('path');

  var post_template;

  if (!Post.theme_layouts[this.data.layout ]) {
    post_template = this.content_manager.site.getThemeDir() + '/_layouts/' + this.data.layout + '.twig';
    try{
      fs.statSync(post_template);
    }
    catch (e){
      throw new Error("The layout file " + this.data.layout + " does not exist in theme " + this.content_manager.site.configuration.theme);
    }
    var template = twig({
        id: 'layout-' + this.data.layout,
        path: post_template,
        async: false
    });
    Post.theme_layouts[this.data.layout ] = template;
  }

  var type_html = this.render('full');
  var html = Post.theme_layouts[this.data.layout ].render({
    site: this.content_manager.site.configuration.site,
    page: _.extend(this.data, {content: type_html})
  });
  var output_file_path = this.content_manager.site.getOutputDir() + '/' + this.data.output_filename;
  mkdirp.sync(path.dirname(output_file_path));
  fs.writeFileSync(output_file_path, html, {encoding: 'utf8'} );
  this.content_manager.addOutput(this.data.path, this.data.output_filename);
};

module.exports = Post;
