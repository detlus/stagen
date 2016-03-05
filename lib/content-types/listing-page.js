/*jslint node: true */
"use strict";

var _ = require('underscore'),
  Twig = require('twig'),
  twig = Twig.twig,
  path = require('path'),
  mkdirp = require('mkdirp'),
  fs = require('fs'),
  stagen = require('../../lib/stagen'),
  stagen_util = require('../../lib/util'),
  util = require('util'),
  ContentType = require('./content-type'),
  TemplateManager = require('../template-manager');


/**
 * Class to represent listing pages.
 */
var ListingPage = function(content_manager, filename, options) {
  // Call super constructor
  ContentType.call(this, content_manager, filename, options);
  this.type = 'listing_page';
};

util.inherits(ListingPage, ContentType);

/**
 * Perform basic initialization of the object.
 */
ListingPage.prototype.init = function() {
  if (!this.data.listing_item) {
    this.content_manager.site.addError("Listing item does not specified in " + this.data.path);
    return;
  }
  this.getContents(this.data.listing_item.type, {reset: true});
};

/**
 * Load contents information for the type.
 */
ListingPage.prototype.getContents = function(type, options) {
  options = _.defaults(options || {}, {reset: false});

  if (!this.contents || options.reset) {
    this.contents = this.content_manager.scanFiles(type);
  }
};

/**
 * Make the object iterable over list of contents.
 */
ListingPage.prototype[Symbol.iterator] = function*() {
  var offset = 0;
  while (offset < this.contents.length) {
    yield this.contents.slice(offset, offset + this.data.listing_item.count);
    offset += this.data.listing_item.count;
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

  // Determine how much pages will be there.
  var page_count = this.contents.length / this.data.listing_item.count;
  // Prepare output file names.
  var output_filenames = [];
  for (var i = 0; i < page_count; i++) {
    output_filenames.push(filename_template.render({num: i === 0 ? '' : i}));
  }
  var content_type_class = this.content_manager.getTypeClass(this.data.listing_item.type);
  var tm = new TemplateManager(this.content_manager.site);
  var layout_template = tm.getLayoutTemplate(this.type);

  var index = 0;
  for (let items of this) {
    var template_var_items = [];
    _.each(items, function(item) {
      var content = new content_type_class(that.content_manager, item.filename)
      template_var_items.push(content.render('teaser'));
    });

    var pagination = {
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

    var type_template = tm.getTypeTemplate(this.type);
    var data = {
      listing: {
        items: template_var_items,
      },
      pagination: pagination,
      site: that.content_manager.site.configuration.site
    };
    data.page = that.data;
    var type_html = type_template.render(_.extend(data, {page: that.data}));
    var html = layout_template.render({
      site: this.content_manager.site.configuration.site,
      page: _.extend(that.data, data, {content: type_html})
    });

    var output_file_path = path.join(that.content_manager.site.getOutputDir(), output_filenames[index]);
    mkdirp.sync(path.dirname(output_file_path));
    fs.writeFileSync(output_file_path, html, {encoding: 'utf8'} );
    index++;
  }
  this.content_manager.addOutput(this.data.path, output_filenames);
};

module.exports = ListingPage;
