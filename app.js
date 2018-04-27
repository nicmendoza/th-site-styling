ko.punches.enableAll();

function EditorModel(){
	var self = this;

	var scssFunctions = [
		'adjust',
		'lighten',
		'darken',
		'saturate',
		'desaturate',
		'grayscale',
		'complement',
		'invert',
		'rgba'
	];

	self.css = ko.observable('');

	self.cssSettings = ko.observableArray();

	self.sectionDescriptions = ko.observable();
	self.assetsLoaded = ko.observable(false);

	self.baseScss = ko.observable();
	self.variablesSCSS = ko.observable();

	self.scssVariablesGenerated = ko.pureComputed(function(){
		return self.cssSettings().map(function(cssSet){
			return `${cssSet.sassVariableName}: ${cssSet.value()} ;`;
		}).join('\n');
	});

	self.scssTypeaheads = ko.pureComputed(function(){
		return scssFunctions.concat(self.cssSettings().map(function(cssSet){
			return cssSet.sassVariableName;
		}));
	});

	self.err = ko.observable('');

	self.niceErr = ko.pureComputed(function(){
		return ( self.err() || '') 
			.replace(/on line.*/gi,'')
	});

	ko.computed(function(variablesSCSS){

	var variablesSCSS = self.scssVariablesGenerated();

	if(!variablesSCSS || !self.assetsLoaded()) return;
		self.err(undefined);
		Sass.writeFile('_variables',variablesSCSS, function(writeRes){
			var baseScss= self.baseScss();
			Sass.compile(baseScss,function(sassRes){
				if(sassRes.message){
					self.err(sassRes.formatted);
				} else {
					self.css(sassRes.text);
				}
				
			});

		});

	});


	self.cssSettingsBySection = ko.pureComputed(function(){
		return self.cssSettings().reduce(function(acc,curr){
			var sectionName = curr.section;
			if(!acc[sectionName]){
				acc[sectionName] = {
					sectionId:sectionName.replace(/\s/g,''),
					description: 'test',
					settings: []
				};
			}
			acc[sectionName].settings.push(curr);
			return acc;
		},{});
	});

	Sass.importer(function(request,done){

		if(request.current === 'bootstrap/variables'){
			
			done({
		      content: self.scssVariablesGenerated()
		    });

		} else {
			done();
		}
	});
	

	self.setupStyleSheet();

}


EditorModel.prototype.updateCSS = function(){
	var self = this;


};

EditorModel.prototype.setupStyleSheet = function(){

	var self = this;
	var promises = [getBaseSCSS(),getVariablesText()];

	var variablesText = '';

	[
		'bootstrap.scss',
		'_alert.scss',
		'_images.scss',
		'_reboot.scss',
		'_badge.scss',
		'_input-group.scss',
		'_functions.scss',
		//'_responsive-embed.scss',
		'_breadcrumb.scss',
		'_jumbotron.scss',
		'_tables.scss',
		'_button-group.scss',
		'_list-group.scss',
		'_tooltip.scss',
		'_buttons.scss',
		'_media.scss',
		'_transitions.scss',
		'_card.scss',
		'_mixins.scss',
		'_type.scss',
		'_carousel.scss',
		'_modal.scss',
		'_utilities.scss',
		'_close.scss',
		'_nav.scss',
		'_variables.scss',
		'_code.scss',
		'_navbar.scss',
		'_custom-forms.scss',
		//'_normalize.scss',
		//'_custom.scss',
		'_pagination.scss',
		'_popover.scss',
		'_dropdown.scss',
		'_forms.scss',
		'_print.scss',
		'_root.scss',
		'_grid.scss',
		'_progress.scss',
		'mixins/_alert.scss',
		'mixins/_list-group.scss',
		'mixins/_background-variant.scss',
		'mixins/_lists.scss',
		'mixins/_badge.scss',
		'mixins/_box-shadow.scss',
		'mixins/_caret.scss',
		'mixins/_nav-divider.scss',
		'mixins/_border-radius.scss',
		'mixins/_navbar-align.scss',
		'mixins/_breakpoints.scss',
		'mixins/_pagination.scss',
		'mixins/_buttons.scss',
		'mixins/_reset-text.scss',
		//'mixins/_cards.scss',
		'mixins/_resize.scss',
		'mixins/_clearfix.scss',
		'mixins/_screen-reader.scss',
		'mixins/_float.scss',
		'mixins/_size.scss',
		'mixins/_forms.scss',
		'mixins/_table-row.scss',
		'mixins/_gradients.scss',
		'mixins/_text-emphasis.scss',
		'mixins/_grid-framework.scss',
		'mixins/_text-hide.scss',
		'mixins/_grid.scss',
		'mixins/_text-truncate.scss',
		'mixins/_hover.scss',
		//'mixins/_transforms.scss',
		'mixins/_image.scss',
		'mixins/_transition.scss',
		'mixins/_visibility.scss',
		'utilities/_align.scss',
		'utilities/_display.scss',
		'utilities/_embed.scss',
		'utilities/_flex.scss',
		'utilities/_spacing.scss',
		'utilities/_background.scss',
		'utilities/_float.scss',
		'utilities/_text.scss',
		'utilities/_borders.scss',
		'utilities/_position.scss',
		'utilities/_sizing.scss',
		'utilities/_visibility.scss',
		'utilities/_clearfix.scss',
		'utilities/_screenreaders.scss'
	]
		.map((f) => [f.replace(/\.scss/g,''),f])
		.forEach(function(nameAndUrlTuple){
			var name = nameAndUrlTuple[0];
			var url = nameAndUrlTuple[1];
			promises.push($.get('node_modules/bootstrap/scss/' + url, function(sass){
				Sass.writeFile(name,sass);
			}));
		});

	$.when.apply($,promises).then(function(){
			self.assetsLoaded(true);
			self.scssVariablesGenerated.notifySubscribers();
			
	});

	

	function getVariablesText(){
		return $.get('variables.scss', function(res){
			self.variablesSCSS(res);
			self.cssSettings(parseVariablesFileAndCreateArrayOfSettings(res));
		});
	}

	function getBaseSCSS(){
		return $.get('node_modules/bootstrap/scss/bootstrap.scss', function(res){
			self.baseScss(res);
		});
	}



	// This processes the loaded scss one line at a time and has a primary 
	// side-effect of updating self.allSettings
	// 
	function parseVariablesFileAndCreateArrayOfSettings(variablesText){
		var lines = variablesText.split('\n');
		// holds last section name. Updates every time new section comment parsed
		var section = '';
		// holds all section descriptions
		var sectionDescriptions = {};

		// holds last setting description. Updates every time new setting comment parsed
		var settingDescription = '';

		var allSettings = [];

		// =====================================================
		// variables and functions to support multi-line content
		var previousLineContent;
		var previousScssLineDidNotEnd = false;
		
		function resetMultiLineVars(){
			previousLineContent = null;
			previousScssLineDidNotEnd = false;
		}
		// =====================================================

	
		lines.forEach(function processScssFileLine(lineText){

			var currentLineIsCommentLine = lineText[0] === '/';
			var currentLineIsFirstLineOfScssVariableDeclaration = lineText[0] === '$';
			var currentLineIslastLineOfRuleSet = lineText[lineText.length-1] === ';';

			//todo: handle multiline comments
			// this is a comment line
			if(currentLineIsCommentLine){
				parseCommentRow(cleanCommentLineText(lineText));
				resetMultiLineVars();
				return;
			}

			// this is a single line css rule-set
			if( currentLineIsFirstLineOfScssVariableDeclaration && currentLineIslastLineOfRuleSet){
				parseScssRuleSetAndAddToSettings(lineText);
				resetMultiLineVars();
				return;
			}

			// this is the beginning of a multiline css rule-set
			if( currentLineIsFirstLineOfScssVariableDeclaration && !currentLineIslastLineOfRuleSet){
				previousLineContent = lineText;
				previousScssLineDidNotEnd = true;
				return;
			}

			// this is the middle or end of a multiline css rule-set
			if( previousScssLineDidNotEnd ) {

				// we accrete all of the line text in `previousLineContent`
				// so we can process it all together
				// add a newline to make these identifiable later
				previousLineContent += ( lineText + '\n');

				// this is the end of a multiline css rule-set
				if(currentLineIslastLineOfRuleSet){
					parseScssRuleSetAndAddToSettings(previousLineContent);
					resetMultiLineVars();
				}

				return;
			}

		});

		self.sectionDescriptions(sectionDescriptions);

		return allSettings;


		function parseCommentRow(lineText){
			

			//ignore empty comments
			if(lineText.length === 0){
				return;
			}

			// process new section lines
			if(lineText[0] === '='){
				lineText = lineText.replace(/=+\s?/,'');
				section = lineText;
				return;
			}

			// process section description lines
			if(lineText[0] === '#'){
				lineText = lineText.replace(/#+\s?/,'');
				// store section description in global desription store
				sectionDescriptions[section] = lineText;
				return;
			}

			// process setting description lines
			if(lineText[0] === '*'){
				lineText = lineText.replace(/\*+\s?/,'');
				settingDescription = lineText;
				return;
			}
		}

		function parseScssRuleSetAndAddToSettings(lineText){

			lineText = lineText.replace(/\s?(!default)?;/,'');

			var indexOfFirstColon = lineText.indexOf(':');

			var sassVar = lineText.slice(0,indexOfFirstColon)
				.trim();
			// +1 to exclude colon
			var val = lineText.slice(indexOfFirstColon + 1)
				//.replace(':','') //remove :
				.trim();


			var controlType = parseControlTypeFromValue(val);
			var valObs;

			allSettings.push({
				section: section,
				name: settingDescription || sassVar,
				sassVariableName: sassVar,
				value: valObs = ko.observable(val),
				controlType: controlType
			});

			// cause these internal settings changes to trigger css updates
			valObs.subscribe(function(){
				self.cssSettings.notifySubscribers();
			});

			// setting descriptions only ever used once
			settingDescription = '';
		}

		function cleanCommentLineText(lineText){
			return lineText.replace('//','').trim();
		}

		function parseControlTypeFromValue(val){

			if(/\n/.test(val)){return 'textarea';}

			return 'text';
		}

	}

};

var em = new EditorModel();
ko.applyBindings(em);



