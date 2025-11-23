import Twig from 'twig';
import moment from 'moment';
import { isUndefined } from 'underscore';


// Replace Twig's default date filter.
Twig.extendFilter("date", function(value, params) {
  if (isUndefined(params)) {
    return moment(value).format();
  }
  else {
    return moment(value).format(params[0]);
  }

});

export default Twig;
