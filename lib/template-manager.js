/*jslint node: true */
"use strict";

var fs = require('fs'),
  Twig = require('twig'),
  twig = Twig.twig;

var TemplateManager = function(site) {
 this.site = site;
};

TemplateManager.type_templates = {};

TemplateManager.prototype.getTypeTemplate = function(type) {
  var type_template;
  if (!TemplateManager.type_templates[type]) {
    type_template = this.site.getThemeDir() + '/_types/' + type + '.twig';
    try{
      fs.statSync(type_template);
    }
    catch (e){
      this.site.addError("The type template file " + type + " does not exist in theme " + this.site.configuration.theme, e);
      return;
    }
    TemplateManager.type_templates[type] = twig({
        id: 'type-' + type,
        path: type_template,
        async: false
    });
  }
  return TemplateManager.type_templates[type];
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
