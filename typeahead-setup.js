// quick and dirty typahead knockoug binding
// multi-autocomplete from: https://stackoverflow.com/a/12663455/3337822
ko.bindingHandlers.typeahead = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var $element = $(element);
	var allBindings = allBindingsAccessor();
	var source = ko.utils.unwrapObservable(valueAccessor());
		
	var options = {
		hint: true,
		highlight: true,
		minLength: 1
	};
	var setup = {
		name: 'scss_functions',
		source: substringMatcher(source),
		updater: function(item) {
        return this.$element.val().replace(/[^,]*$/,'')+item+',';
	    },
	    matcher: function (item) {
	      var tquery = extractor(this.query);
	      if(!tquery) return false;
	      return ~item.toLowerCase().indexOf(tquery.toLowerCase())
	    },
	    highlighter: function (item) {
	      var query = extractor(this.query).replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&')
	      return item.replace(new RegExp('(' + query + ')', 'ig'), function ($1, match) {
	        return '<strong>' + match + '</strong>'
	      })
    }
	}

	$element
		.attr('autocomplete', 'off')
		.typeahead(options, setup);
	}
};

var substringMatcher = function(strs) {
  return function findMatches(q, cb) {
    var matches, substringRegex;

    // an array that will be populated with substring matches
    matches = [];

    // handle regex control characters, support multiple string typeaheads accounting
    // for css formatting (i.e. only look at things after a space, comma, or paren)

    // 1. replace chars we want to split on with a distinctive set of chars that are
    // not control chracters
    // 2. escape regex control characters to prevent JS errors caused by valid CSS input
    // 3. split on CSS chars that are denote separation of meaningful css "things"
    // 4. only push in the last user-entered value to typeahead.js
    var splitToken = 'IIIII'
    q = q.replace(/[\s\(\),]/ig,splitToken);
    var escapedQ = escapeRegExp(q).split(splitToken).pop();

    // regex used to determine if a string contains the substring `q`
    substrRegex = new RegExp(escapedQ, 'i');

    // iterate through the pool of strings and for any string that
    // contains the substring `q`, add it to the `matches` array
    $.each(strs, function(i, str) {
      if (substrRegex.test(str)) {
        matches.push(str);
      }
    });

    cb(matches);
  };
};

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}