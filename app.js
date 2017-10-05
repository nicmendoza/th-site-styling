ko.punches.enableAll();

function EditorModel(){
	var self = this;

	self.css = ko.observable('');

	self.cssSettings = ko.observableArray();

	self.sectionDescriptions = ko.observable();
	self.assetsLoaded = ko.observable(false);

	self.baseScss = ko.observable();
	self.variablesSCSS = ko.observable();

	self.scssVariablesGenerated = ko.pureComputed(function(){
		//prepend this thing that's being stripped out currently
		var staticSCSS = `
			$bootstrap-sass-asset-helper: false !default;
		`;
		return staticSCSS + self.cssSettings().map(function(cssSet){
			return `${cssSet.sassVariableName}: ${cssSet.value()} ;`;
		}).join('\n');
	});

	ko.computed(function(variablesSCSS){

		var variablesSCSS = self.scssVariablesGenerated();

		if(!variablesSCSS || !self.assetsLoaded()) return;

		Sass.writeFile('bootstrap/variables',variablesSCSS, function(writeRes){
			var baseScss= self.baseScss();
			Sass.compile(baseScss,function(sassRes){
				self.css(sassRes.text);
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


}

EditorModel.prototype.setupStyleSheet = function(){

	var self = this;
	var promises = [getBaseSCSS(),getVariablesText()];

	var variablesText = '';

	[
		['bootstrap/alerts','_alerts.scss'],
		['bootstrap/navs','_navs.scss'],
		['bootstrap/badges','_badges.scss'],
		['bootstrap/normalize','_normalize.scss'],
		['bootstrap/breadcrumbs','_breadcrumbs.scss'],
		['bootstrap/pager','_pager.scss'],
		['bootstrap/button-groups','_button-groups.scss'],
		['bootstrap/pagination','_pagination.scss'],
		['bootstrap/buttons','_buttons.scss'],
		['bootstrap/panels','_panels.scss'],
		['bootstrap/carousel','_carousel.scss'],
		['bootstrap/popovers','_popovers.scss'],
		['bootstrap/close','_close.scss'],
		['bootstrap/print','_print.scss'],
		['bootstrap/code','_code.scss'],
		['bootstrap/progress-bars','_progress-bars.scss'],
		['bootstrap/component-animations','_component-animations.scss'],
		['bootstrap/responsive-embed','_responsive-embed.scss'],
		['bootstrap/dropdowns','_dropdowns.scss'],
		['bootstrap/responsive-utilities','_responsive-utilities.scss'],
		['bootstrap/forms','_forms.scss'],
		['bootstrap/scaffolding','_scaffolding.scss'],
		['bootstrap/glyphicons','_glyphicons.scss'],
		['bootstrap/tables','_tables.scss'],
		['bootstrap/grid','_grid.scss'],
		['bootstrap/theme','_theme.scss'],
		['bootstrap/input-groups','_input-groups.scss'],
		['bootstrap/thumbnails','_thumbnails.scss'],
		['bootstrap/jumbotron','_jumbotron.scss'],
		['bootstrap/tooltip','_tooltip.scss'],
		['bootstrap/labels','_labels.scss'],
		['bootstrap/type','_type.scss'],
		['bootstrap/list-group','_list-group.scss'],
		['bootstrap/utilities','_utilities.scss'],
		['bootstrap/media','_media.scss'],
		//['bootstrap/variables','_variables.scss'],
		['bootstrap/mixins','_mixins.scss'],
		['bootstrap/wells','_wells.scss'],
		['bootstrap/modals','_modals.scss'],
		['bootstrap/navbar','_navbar.scss'],
		['mixins/_alerts','mixins/_alerts.scss'],
		['mixins/_nav-vertical-align','mixins/_nav-vertical-align.scss'],
		['mixins/_background-variant','mixins/_background-variant.scss'],
		['mixins/_opacity','mixins/_opacity.scss'],
		['mixins/_border-radius','mixins/_border-radius.scss'],
		['mixins/_pagination','mixins/_pagination.scss'],
		['mixins/_buttons','mixins/_buttons.scss'],
		['mixins/_panels','mixins/_panels.scss'],
		['mixins/_center-block','mixins/_center-block.scss'],
		['mixins/_progress-bar','mixins/_progress-bar.scss'],
		['mixins/_clearfix','mixins/_clearfix.scss'],
		['mixins/_reset-filter','mixins/_reset-filter.scss'],
		['mixins/_forms','mixins/_forms.scss'],
		['mixins/_reset-text','mixins/_reset-text.scss'],
		['mixins/_gradients','mixins/_gradients.scss'],
		['mixins/_resize','mixins/_resize.scss'],
		['mixins/_grid-framework','mixins/_grid-framework.scss'],
		['mixins/_responsive-visibility','mixins/_responsive-visibility.scss'],
		['mixins/_grid','mixins/_grid.scss'],
		['mixins/_size','mixins/_size.scss'],
		['mixins/_hide-text','mixins/_hide-text.scss'],
		['mixins/_tab-focus','mixins/_tab-focus.scss'],
		['mixins/_image','mixins/_image.scss'],
		['mixins/_table-row','mixins/_table-row.scss'],
		['mixins/_labels','mixins/_labels.scss'],
		['mixins/_text-emphasis','mixins/_text-emphasis.scss'],
		['mixins/_list-group','mixins/_list-group.scss'],
		['mixins/_text-overflow','mixins/_text-overflow.scss'],
		['mixins/_nav-divider','mixins/_nav-divider.scss'],
		['mixins/_vendor-prefixes','mixins/_vendor-prefixes.scss']
		]
		.forEach(function(nameAndUrlTuple){
			var name = nameAndUrlTuple[0];
			var url = nameAndUrlTuple[1];
			promises.push($.get('node_modules/bootstrap-sass/assets/stylesheets/bootstrap/' + url, function(sass){
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
			self.cssSettings(createVariablesFileContents(res));
		});
	}

	function getBaseSCSS(){
		return $.get('node_modules/bootstrap-sass/assets/stylesheets/_bootstrap.scss', function(res){
			self.baseScss(res);
		});
	}


	function createVariablesFileContents(variablesText){
		var lines = variablesText.split('\n');
		// holds last section name. Updates every time new section comment parsed
		var section = '';
		// holds all section descriptions
		var sectionDescriptions = {};

		// holds last setting description. Updates every time new setting comment parsed
		var settingDescription = '';


		var allSettings = [];

		lines.forEach(function(lineText){

			if(lineText[0] === '/'){
				parseCommentRow(cleanCommentLineText(lineText));
			} else if(lineText[0] === '$'){
				if(!section){return}// ignore untethered settings at top of file
				parseVariableRow(lineText);
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

		function parseVariableRow(lineText){

			lineText = lineText.replace(/\s?!default;/,'');

			var sassVar = lineText.match(/\$.*:/)[0] // get everything up to :
				.replace(':','').trim(); //remove :
			var val = lineText.match(/:.*/)[0] //get everything after :
				.replace(':','') //remove :
				.replace(/\/\/.*/,'') // remove trailing comments
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
			return 'text';
		}

	}

};

var em = new EditorModel();
ko.applyBindings(em);



