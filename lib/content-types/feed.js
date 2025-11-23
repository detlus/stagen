/*jslint node: true */
"use strict";

// var _ = require('underscore'),
//   Twig = require('../twig'),
//   twig = Twig.twig,
//   path = require('path'),
//   stagen_util = require('../util'),
//   util = require('util'),
//   Content = require('./content');

import Content from './content.js';
import path from 'path';
import _ from 'underscore';
import util from 'util';
import Twig from '../twig.js';
import moment  from 'moment';

var twig = Twig.twig;

/**
 * Class to represent listing pages.
 */
class Feed extends Content {
  constructor(content_manager, filename, options) {
    // Call super constructor
    super(content_manager, filename, options);
  }
  /**
   * Perform basic initialization of the object.
   */
  init() {
    if (!this.data.permalink) {
      this.data.permalink = this.data.path.substring(0, this.data.path.lastIndexOf('.')) + '.xml';
      this.data.output_filename = this.data.permalink;
    }
    else if (this.data.permalink.charAt(this.data.permalink.length - 1) === '/') {
      this.data.output_filename = this.data.permalink + 'index.xml';
    }
    else {
      this.data.output_filename = this.data.permalink;
    }

    if (!this.data.feed_item) {
      this.content_manager.site.addError("Feed item does not specified in " + this.data.path);
      return;
    }
    this.getContents(this.data.feed_item.type, { reset: true });
  }
  /**
   * Load contents information for the type.
   */
  getContents(type, options) {
    options = _.defaults(options || {}, { reset: false });

    if (!this.contents || options.reset) {
      this.contents = this.content_manager.loadContents(type);
    }
  }
  /**
   * Make the object iterable over list of contents.
   */
  getItems() {
    var offset = 0;
    return this.contents.slice(0, this.data.feed_item.count);
  }
  /**
   * Generate the HTML out for the listing page.
   * It will generate multiple files depending on the number of contents and
   * count per page.
   */
  generate() {
    var that = this;
    var content_type_class = this.content_manager.getTypeClass(this.data.feed_item.type);

    var index = 0;
    var items = this.getItems();
    _.each(items, function (item) {
      that.content_manager.addDependency(item.filename, that.filename);
    });
    var type_template = that.getTypeTemplate(Feed.type);

    var data = {
      feed: {
        items: items,
      },
      page: that.data,
      // pagination: pagination,
      site: that.content_manager.site.configuration.site,
      theme: this.content_manager.site.default_theme
    };
    data.page.datetime = new Date();
    data.page = that.data;
    var type_html = type_template.render(data);

    this.content_manager.writeOutput(type_html, this.data.output_filename, this.data.path);
    index++;
    this.content_manager.subscribeContentType(this.filename, this.data.feed_item.type);
  }
  getDefaultTemplate() {
    var template_string = '<?xml version="1.0" encoding="UTF-8"?>\
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\
  <channel>\
    <title>{{ site.title | escape("html") }}</title>\
    <description>{{ site.description | escape("html") }}</description>\
    <link>{{ site.url }}{{ site.baseurl }}/</link>\
    <atom:link href="{{ site.url ~ site.baseurl ~ page.permalink }}" rel="self" type="application/rss+xml"/>\
    <pubDate>{{ page.datetime | date("YYYY") }}</pubDate>\
    <lastBuildDate>{{ page.datetime | date }}</lastBuildDate>\
    <generator>Stagen</generator>\
    {% for item in feed.items %}\
      <item>\
        <title>{{ item.title | escape }}</title>\
        <description>{{ item.excerpt | escape }}</description>\
        <pubDate>{{ item.datetime | date }}</pubDate>\
        <link>{{ site.url ~ site.baseurl ~ item.url }}</link>\
        <guid isPermaLink="true">{{ site.url ~ site.baseurl ~ item.url }}</guid>\
        {% for tag in item.tags %}\
        <category>{{ tag | escape }}</category>\
        {% endfor %}\
        {% for cat in item.categories %}\
        <category>{{ cat | escape }}</category>\
        {% endfor %}\
      </item>\
    {% endfor %}\
  </channel>\
</rss>';
    return twig({
      data: template_string,
      async: false
    });

  }
  getTemplateSuggestions() {
    var suggestions = [];
    if (this.data.listing_type) {
      suggestions.push(this.data.listing_type);
    }
    return suggestions;
  }
}

Feed.type = 'feed';

export default Feed;
