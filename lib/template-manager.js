/*jslint node: true */
"use strict";

var fs = require('fs'),
  Twig = require('./twig'),
  twig = Twig.twig,
  _ = require('underscore');

var TemplateManager = function(site) {
 this.site = site;
};

TemplateManager.type_templates = {};

TemplateManager.prototype.getTypeTemplate = function(type, suggestions) {
  var type_template_path;
  var type_template;
  var suggestions_copy = suggestions.slice(0).reverse();
  var template_file_exists = false;
  for (var i = 0; i < suggestions_copy.length; i++) {
    var template_filename = type + '--' + suggestions_copy[i];
    if (!TemplateManager.type_templates[template_filename]) {
      template_file_exists = false;
      type_template_path = this.site.getThemeDir() + '/_types/' + template_filename + '.twig';
      try{
        fs.statSync(type_template_path);
        template_file_exists = true;
      }
      catch (e){}
      if (template_file_exists) {
        type_template = TemplateManager.type_templates[template_filename] = twig({
            id: 'type-' + template_filename,
            path: type_template_path,
            async: false
        });
      }
    }
    else {
      template_file_exists = true;
      type_template = TemplateManager.type_templates[template_filename];
    }
  }
  if (!template_file_exists) {
    if (!TemplateManager.type_templates[type]) {
      type_template_path = this.site.getThemeDir() + '/_types/' + type + '.twig';
      try{
        fs.statSync(type_template_path);
      }
      catch (e){}
      type_template = TemplateManager.type_templates[type] = twig({
          id: 'type-' + type,
          path: type_template_path,
          async: false
      });
    }
    else {
      template_file_exists = true;
      type_template = TemplateManager.type_templates[type];
    }
  }
  return type_template;
};

TemplateManager.layout_templates = {};

TemplateManager.prototype.getDefaultLayoutTemplate = function() {
  var type = 'default';
  if (!TemplateManager.layout_templates[type]) {
    var template = this.site.getThemeDir() + '/_layouts/' + type + '.twig';
    try{
      fs.statSync(template);
    }
    catch (e){
      this.site.addError("The layout template file " + type + " does not exist in theme " + this.site.configuration.theme, e);
      return;
    }
    TemplateManager.layout_templates[type] = twig({
        id: 'layout-' + type,
        path: template,
        async: false
    });
  }
  return TemplateManager.layout_templates[type];
};

TemplateManager.prototype.getLayoutTemplate = function(type) {
  if (!TemplateManager.layout_templates[type]) {
    var template = this.site.getThemeDir() + '/_layouts/' + type + '.twig';
    try{
      fs.statSync(template);
    }
    catch (e){
      // Fall back to default layout.
      return this.getDefaultLayoutTemplate();
    }
    TemplateManager.layout_templates[type] = twig({
        id: 'layout-' + type,
        path: template,
        async: false
    });
  }
  return TemplateManager.layout_templates[type];
};

module.exports = TemplateManager;
