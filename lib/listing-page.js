/*jslint node: true */
"use strict";

var _ = require('underscore'),
  Twig = require('twig'),
  twig = Twig.twig,
  path = require('path'),
  mkdirp = require('mkdirp'),
  fs = require('fs'),
  stagen = require('../lib/stagen');


/**
 * Class to represent listing pages.
 */
var ListingPage = function(content_manager, page_data) {
  this.content_manager = content_manager;
  this.page_data = page_data;
  this.init();
};

/**
 * Perform basic initialization of the object.
 */
ListingPage.prototype.init = function() {
  this.getContents(this.page_data.attributes.listing_item.type, {reset: true});
};

/**
 * Load contents information for the type.
 */
ListingPage.prototype.getContents = function(type, options) {
  options = _.defaults(options || {}, {reset: false});

  if (!this.contents || options.reset) {
    var filesinfo = this.content_manager.scanFiles(type);
    this.contents = filesinfo.filter(function(item) {
      return item.layout && item.layout === type;
    });
  }
};

/**
 * Make the object iterable over list of contents.
 */
ListingPage.prototype[Symbol.iterator] = function*() {
  var offset = 0;
  while (offset < this.contents.length) {
    yield this.contents.slice(offset, offset + this.page_data.attributes.listing_item.count);
    offset += this.page_data.attributes.listing_item.count;
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
      data: this.page_data.attributes.permalink,
      async: false
  });

  // Determine how much pages will be there.
  var page_count = this.contents.length / this.page_data.attributes.listing_item.count;
  // Prepare output file names.
  var output_filenames = [];
  for (var i = 0; i < page_count; i++) {
    output_filenames.push(filename_template.render({num: i === 0 ? '' : i}));
  }

  var index = 0;
  for (let items of this) {
    var template_var_items = [];
    _.each(items, function(item) {
      var post = new stagen.Post(that.content_manager, item.filename)
      template_var_items.push(post.render('teaser'));
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

    var page_template_file = that.content_manager.site.getThemeDir() + '/_listings/' + that.page_data.attributes.listing_item.type + 's' + '.twig';
    try{
      fs.statSync(page_template_file);
    }
    catch (e){
      throw new Error("The listing template file " + that.page_data.attributes.listing_item.type + " does not exist in theme " + this.site.configuration.theme);
    }
    var page_template = twig({
        path: page_template_file,
        async: false
    });
    var html = page_template.render({
      listing: {
        items: template_var_items,
      },
      pagination: pagination,
      page: _.extend(that.page_data.attributes),
      site: that.content_manager.site.configuration.site
    });

    var output_file_path = path.join(that.content_manager.site.getOutputDir(), output_filenames[index]);
    mkdirp.sync(path.dirname(output_file_path));
    fs.writeFileSync(output_file_path, html, {encoding: 'utf8'} );
    index++;
  }
  this.content_manager.addOutput(this.page_data.path, output_filenames);
};

module.exports = ListingPage;
