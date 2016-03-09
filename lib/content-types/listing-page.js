/*jslint node: true */
"use strict";

var _ = require('underscore'),
  Twig = require('../twig'),
  twig = Twig.twig,
  path = require('path'),
  stagen = require('../stagen'),
  stagen_util = require('../util'),
  util = require('util'),
  Content = require('./content'),
  TemplateManager = require('../template-manager');


/**
 * Class to represent listing pages.
 */
var ListingPage = function(content_manager, filename, options) {
  // Call super constructor
  Content.call(this, content_manager, filename, options);
  _.defaults(this.data.listing_item, {count: 10});
};

ListingPage.type = 'listing_page';

util.inherits(ListingPage, Content);

/**
 * Perform basic initialization of the object.
 */
ListingPage.prototype.init = function() {
  if (!this.data.permalink) {
    this.content_manager.site.addError("Permalink is not specified for the listing page " + this.data.path);
  }
  if (!this.data.listing_item) {
    this.content_manager.site.addError("Listing item does not specified in " + this.data.path);
    return;
  }
  else {
    this.getContents(this.data.listing_item.type, {reset: true});
  }
};

/**
 * Load contents information for the type.
 */
ListingPage.prototype.getContents = function(type, options) {
  options = _.defaults(options || {}, {reset: false});

  if (!this.contents || options.reset) {
    // TODO: Make filtering criteria proviable at command line.
    this.contents = this.content_manager.scanFiles(type);
  }
};

/**
 * Make the object iterable over list of contents.
 */
ListingPage.prototype[Symbol.iterator] = function*() {
  if (this.data.pager === false) {
    yield this.contents.slice(0, this.data.listing_item.count);
  }
  else {
    var offset = 0;
    while (offset < this.contents.length) {
      yield this.contents.slice(offset, offset + this.data.listing_item.count);
      offset += this.data.listing_item.count;
    }
  }
};

/**
 * Generate the HTML out for the listing page.
 * It will generate multiple files depending on the number of contents and
 * count per page.
 */
ListingPage.prototype.generate = function() {
  var that = this;
  // Create template object for output filenames.
  var filename_template = twig({
      data: this.data.permalink,
      async: false
  });

  var footer_template;
  if (this.data.footer) {
    footer_template = twig({
        data: this.data.footer,
        async: false
    });
  }
  var header_template;
  if (this.data.header) {
    header_template = twig({
        data: this.data.header,
        async: false
    });
  }

  // Determine how much pages will be there.
  var page_count;
  if (this.data.pager === false) {
    page_count = 1;
  }
  else {
    page_count = this.contents.length / this.data.listing_item.count;
  }
  // Prepare output file names.
  var output_filenames = [];
  for (var i = 0; i < page_count; i++) {
    output_filenames.push(filename_template.render({num: i === 0 ? '' : i}));
  }
  var content_type_class = this.content_manager.getTypeClass(this.data.listing_item.type);
  var tm = new TemplateManager(this.content_manager.site);
  var layout_template = tm.getLayoutTemplate(ListingPage.type);

  var index = 0;
  for (let items of this) {
    var template_var_items = [];
    _.each(items, function(item) {
      template_var_items.push(item.render('teaser'));
    });

    var pagination;
    if (this.data.pager !== false) {
      pagination = {
        count: page_count,
        current_page: index,
        pages: output_filenames,
      };
      if (index > 0) {
        pagination.previous = output_filenames[index - 1];
      }
      if (index < page_count) {
        pagination.next = output_filenames[index + 1];
      }
    }

    var type_template = that.getTypeTemplate(ListingPage.type);

    var data = {
      listing: {
        items: template_var_items,
      },
      pagination: pagination,
      site: that.content_manager.site.configuration.site
    };
    data.page = that.data;
    if (this.data.footer) {
      data.page.footer = footer_template.render(data);
    }
    if (this.data.header) {
      data.page.header = header_template.render(data);
    }
    var type_html = type_template.render(data);
    var html = layout_template.render({
      site: this.content_manager.site.configuration.site,
      page: _.extend(that.data, data, {content: type_html})
    });

    this.content_manager.writeOutput(html, output_filenames[index], this.data.path);
    index++;
  }
};

ListingPage.prototype.getDefaultTemplate = function() {
  var template_string =
  '<div>{{page.body}}</div>\
<div>\
{% for item in listing.items %}\
  {{ item }}\
{% endfor %}\
</div>\
<nav>\
  {% if pagination.count %}\
  {% if pagination.current_page > 0 %}\
    <a href="{{ pagination.pages[pagination.current_page - 1] }}">Previous</a>\
  {% endif %}\
  <ul>\
  {% for page in pagination.pages %}\
    <li>\
    {% if pagination.current_page == loop.index0 %}\
      {{ loop.index }}\
    {% else %}\
      <a href="{{ page }}">{{ loop.index }}</a>\
    {% endif %}\
    </li>\
  {% endfor %}\
  </ul>\
  {% if pagination.current_page < pagination.count - 1 %}\
    <a href="{{ pagination.pages[pagination.current_page + 1] }}">Next</a>\
  {% endif %}\
  {% endif %}\
</nav>';
  return twig({
      data: template_string,
      async: false
  });

};

ListingPage.prototype.getTemplateSuggestions = function() {
  var suggestions = [];
  if (this.data.listing_type) {
    suggestions.push(this.data.listing_type);
  }
  return suggestions;
};

ListingPage.prototype.isValid = function() {
  if (ListingPage.super_.prototype.isValid.apply(this) && this.data.listing_item && this.data.listing_item.type && this.data.permalink) {
    return true;
  }
  else {
    return false;
  }
};

module.exports = ListingPage;
