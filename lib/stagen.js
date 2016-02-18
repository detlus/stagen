var yaml = require('js-yaml'),
  fs = require('fs'),
  _ = require('underscore'),
  Twig = require('twig'),
  twig = Twig.twig,
  fm = require('front-matter'),
  kramed = require('kramed'),
  mkdirp = require('mkdirp');


var Site = function(path) {
  this.path = path;
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
    {output_dir: '_site'}
  );

  var content_dir = this.path + '/_content';

  var contents = fs.readdirSync(content_dir);

  _.each(contents, function(item){
    var file_path = content_dir + '/' + item;
    var stat = fs.statSync(file_path);

    if (stat.isFile()) {
      var data = fs.readFileSync(file_path, {encoding: 'utf8'});
      var post_data = fm(data);

      var post = new Post(
        that,
        _.extend(
          {body: kramed(post_data.body), path: item},
          post_data.attributes
        )
      );
      post.generate();
    }
  });
};

Site.prototype.getOutputDir = function() {
  return this.path + '/' + this.configuration.output_dir;
};


// Post class to create objects represnting posts.
var Post = function(site, post, options) {
  this.site = site;
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

/**
 * Generate the HTML output for the post and create HTML static file.
 */
Post.prototype.generate = function() {
  var path = require('path');
  var post_template = this.site.path + '/_themes/' + this.site.configuration.theme + '/layouts/' + this.post.layout + '.html';
  var template = twig({
      id: 'post',
      path: post_template,
      async: false
  });
  var html = template.render({site: this.site.configuration.site, post: this.post});
  var output_file_path = this.site.getOutputDir() + '/' + this.post.permalink;
  mkdirp.sync(path.dirname(output_file_path));
  fs.writeFileSync(output_file_path, html, {encoding: 'utf8'} );
};

module.exports = {
  Post: Post,
  Site: Site
};
