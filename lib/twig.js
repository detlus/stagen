var Twig = require('twig'),
  moment = require('moment'),
  _ = require('underscore');

// Replace Twig's default date filter.
Twig.extendFilter("date", function(value, params) {
  if (_.isUndefined(params)) {
    return moment(value).format();
  }
  else {
    return moment(value).format(params[0]);
  }

});

module.exports = Twig;
