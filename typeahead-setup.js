// quick and dirty typahead knockoug binding

const MINLENGTH = 1;

ko.bindingHandlers.typeahead = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var $element = $(element);
	var allBindings = allBindingsAccessor();
	var source = ko.utils.unwrapObservable(valueAccessor());
		
	var options = {
		hint: true,
		highlight: true,
		minLength: MINLENGTH
	};
	var setup = {
		name: 'scss_functions',
		source: substringMatcher(source)
	}

	$element
		.attr('autocomplete', 'off')
		.typeahead(options, setup)
		.bind('change paste keyup', updateMinLengthToLastGroup)
	}
};

const cssValueGroupsRegex = /[\s\(\),]/ig;

function updateMinLengthToLastGroup(ev,suggestion){
	var $input = $(ev.target);
	var val = $input.val();
	var elData = $input.data();

	if(!elData.ttTypeahead)return;

	var currentMinLength = elData.ttTypeahead.minLength;
	var startingPositionOfMinLength = MINLENGTH - 2;

	var positionOfLastCssSeparator = Math.max(
		startingPositionOfMinLength,
		val.lastIndexOf(','),
		val.lastIndexOf('('),
		val.lastIndexOf(')')
	);

	// this handles the specific case of the minLength being increased, but then later decreased
	// because the user deletes all separators
	var minLengthOverset = positionOfLastCssSeparator === startingPositionOfMinLength && currentMinLength !== MINLENGTH

	if(positionOfLastCssSeparator === val.length - 1 || minLengthOverset ){
		$(ev.target).typeahead('close');
		var newMinLength = positionOfLastCssSeparator + 2;

		// typeahead appears to offer no API for updating this option
		// programatically so doing it directly via jQuery.
		// will break if they change their implementation
		var oldData = $.data(ev.target,'ttTypeahead');
		var newData = $.extend(oldData,{minLength: newMinLength})
		$.data(ev.target,'ttTypeahead', newData);
	}

	
}

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
    q = q.replace(cssValueGroupsRegex,splitToken);
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