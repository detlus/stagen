/*jslint node: true */
"use strict";

var path = require('path'),
  _ = require('underscore'),
  stagen_util = require('../util'),
  util = require('util'),
  Content = require('./content'),
  TemplateManager = require('../template-manager'),
  Twig = require('../twig'),
  twig = Twig.twig,
  moment = require('moment');

// Post class to create objects represnting posts.
var Post = function(content_manager, filename, options) {
  // Call super constructor
  Content.call(this, content_manager, filename, options);
};

Post.type = 'post';

util.inherits(Post, Content);

Post.prototype.init = function() {
  // Prepare permalink and output filename
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

  if (!this.data.datetime) {
    var date;
    if (this.data.date) {
      this.data.datetime = this.data.date;
      if (!(this.data.date instanceof Date)){
        let moment_date = moment(this.data.date);
        if (moment_date.isValid()) {
          this.data.date = moment_date.toDate();
        }
        else {
          this.content_manager.site.addError('Date property of post ' + this.filename + ' is invalid');
          this.data.date = new Date();
        }
        this.data.datetime = this.data.date;
      }
    }
    else if (date = this.getDatetimeFromFilename()) {
      this.data.datetime = date;
    }
    else {
      this.data.datetime = new Date();
    }
  }
  else if (!(this.data.datetime instanceof Date)){
    let moment_date = moment(this.data.datetime);
    if (moment_date.isValid()) {
      this.data.datetime = moment_date.toDate();
    }
    else {
      this.content_manager.site.addError('Datetime property of post ' + this.filename + ' is invalid');
      this.data.datetime = new Date();
    }
  }

  if (!this.data.excerpt && this.data.body) {
    // Why it does work for double lines? May be JS specific feature.
    this.data.excerpt = this.data.body.split(/[\r\n]/gm, 1)[0];
  }
};

Post.prototype.getDatetimeFromFilename = function() {
  var basefilename = path.parse(this.data.path).base;
  var filename_with_date_pattern = /^(\d{4}\-\d{2}\-\d{2})-.*/;
  if (filename_with_date_pattern.test(basefilename)) {
    return new Date(filename_with_date_pattern.exec(basefilename)[1]);
  }
};

Post.prototype.render = function(mode) {
  var type_template = this.getTypeTemplate(Post.type);
  return type_template.render({site: this.content_manager.site.configuration.site, post: this.data, view_mode: mode});
};
/**
 * Generate the HTML output for the post and create HTML static file.
 */
Post.prototype.generate = function() {
  var path = require('path');
  var tm = new TemplateManager(this.content_manager.site);
  var post_template = tm.getLayoutTemplate(Post.type);

  var type_html = this.render('full');
  var html = post_template.render({
    site: this.content_manager.site.configuration.site,
    page: _.extend(this.data, {content: type_html})
  });
  this.content_manager.writeOutput(html, this.data.output_filename, this.data.path);
};

Post.prototype.getDefaultTemplate = function() {
  var template_string =
  '<article class="post" itemtype="http://schema.org/Article" role="article">\
  <header class="post-header">\
    <h1 class="post-title" itemprop="name">\
      {% if view_mode == "teaser" %}\
        <a href="{{post.permalink}}">{{post.title}}</a>\
      {% else %}\
        {{post.title}}\
      {% endif %}\
    </h1>\
  </header>\
  <div>{% if view_mode == "teaser" %}{{post.excerpt}}{% else %}{{post.body}}{% endif %}</div>\
</article>';
  return twig({
      data: template_string,
      async: false
  });
};

Post.sort = function(a, b) {
  if (!a.data.datetime && b.data.datetime) {
    return 1;
  }
  else if (a.data.datetime && !b.data.datetime) {
    return -1;
  }
  else if (!a.data.datetime && !b.data.datetime) {
    return 0;
  }
  return b.data.datetime.getTime() - a.data.datetime.getTime();
};

module.exports = Post;
