/*jslint node: true */
"use strict";

var path = require('path'),
  _ = require('underscore'),
  stagen_util = require('../util'),
  util = require('util'),
  Content = require('./content'),
  TemplateManager = require('../template-manager'),
  Twig = require('../twig'),
  twig = Twig.twig;

// Page class to create objects represnting pages.
var Page = function(content_manager, filename, options) {
  // Call super constructor
  Content.call(this, content_manager, filename, options);
};

Page.type = 'page';

util.inherits(Page, Content);

Page.prototype.init = function() {
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

  if (!this.data.excerpt && this.data.body) {
    // Why it does work for double lines? May be JS specific feature.
    this.data.excerpt = this.data.body.split(/[\r\n]/gm, 1)[0];
  }
};

Page.prototype.render = function(mode) {
  var type_template = this.getTypeTemplate(Page.type);
  if (type_template) {
    return type_template.render({site: this.content_manager.site.configuration.site, page: this.data, view_mode: mode});
  }
};
/**
 * Generate the HTML output for the page and create HTML static file.
 */
Page.prototype.generate = function() {
  var path = require('path');
  var tm = new TemplateManager(this.content_manager.site);
  var post_template = tm.getLayoutTemplate(Page.type);

  var type_html = this.render('full');
  var html = post_template.render({
    site: this.content_manager.site.configuration.site,
    page: _.extend(this.data, {
      content: type_html,
      head: this.getHead(),
      footer: this.getFooter()
    })
  });
  this.content_manager.writeOutput(html, this.data.output_filename, this.data.path);
};

Page.prototype.getDefaultTemplate = function() {
  var template_string =
  '<article class="page" itemtype="http://schema.org/Article" role="article">\
  <header class="page-header">\
    <h1 class="page-title" itemprop="name">\
      {% if view_mode == "teaser" %}\
        <a href="{{page.permalink}}">{{page.title}}</a>\
      {% else %}\
        {{page.title}}\
      {% endif %}\
    </h1>\
  </header>\
  <div>{% if view_mode == "teaser" %}{{page.excerpt}}{% else %}{{page.body}}{% endif %}</div>\
</article>';
  return twig({
      data: template_string,
      async: false
  });
};

module.exports = Page;
