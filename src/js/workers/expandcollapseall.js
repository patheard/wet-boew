/*
 * Web Experience Toolkit (WET) / Boîte à outils de l'expérience Web (BOEW)
 * wet-boew.github.io/wet-boew/License-eng.html / wet-boew.github.io/wet-boew/Licence-fra.html
 */
/*
 * Expand/Collapse All Content plugin
 */
/*global jQuery: false, wet_boew_expandcollapseall: false */
(function ($) {
	"use strict";
	var _pe = window.pe || {
		fn : {}
	};
	_pe.fn.expandcollapseall = {
		type : 'plugin',
		_isPolyfill : false,	// Is the browser using the details polyfill?
		_open : false,			// Globally track the toggle state to support multiple controls on a page
		_togglers : [],			// Reference to all toggle controls
		_aria_controls : null,	// Space separated ID list of details elements for toggle control aria-controls attribute
		_exec : function (elm) {
			var opts,
				overrides;

			// Default options
			opts = {
				togglers: {			// Define the toggle controls to create
					toggle: false,	// Toggle open and close
					open: false,	// Toggle open only
					close: false,	// Toggle close only
					none: false		// Do not render any toggle controls
				},
				accentFirst: false,	// Add 'button-accent' class to first toggle control
				accordion: false,	// Only allow one <details> element to be open at a time
				printOpen: false,	// Toggle open before print
				text: {				// Button text and titles
					toggle: _pe.dic.get('%td-toggle'),
					open: _pe.dic.get('%td-open'),
					close: _pe.dic.get('%td-close'),
					titleOpen: _pe.dic.get('%td-ttl-open'),
					titleClose: _pe.dic.get('%td-ttl-close')
				}
			};

			// Check for overrides from CSS classes
			overrides = {
				togglers: {
					toggle: elm.hasClass('toggle') ? true : false,
					open: elm.hasClass('toggle-open') ? true : false,
					close: elm.hasClass('toggle-close') ? true : false,
					none: elm.hasClass('toggle-none') ? true : false
				},
				accentFirst: elm.hasClass('accent-first') ? true : undefined,
				accordion: elm.hasClass('accordion') ? true : undefined,
				printOpen: elm.hasClass('print-open') ? true : undefined
			};

			// Extend the defaults with settings passed through settings.js (wet_boew_expandcollapseall) and class-based overrides
			$.extend(opts, (typeof wet_boew_expandcollapseall !== 'undefined' ? wet_boew_expandcollapseall : {}), overrides, _pe.data.getData(elm, 'wet-boew'));

			this._isPolyfill = _pe.html.hasClass('polyfill-detailssummary');

			// Initialize the togglers unless the user has explicitly asked for none
			if (opts.togglers.none === false) {
				this._initTogglers(elm, opts);
			}

			// Initialize the accordtion
			if (opts.accordion === true) {
				this._initAccordion();
			}

			// Open details on print
			if (opts.printOpen === true) {
				this._initPrint();
			}

			return elm;
		}, // end of exec

		isOpen : function () {
			return this._open;
		},

		setOpen : function (open) {
			this._open = open;
		},

		toggle : function () {
			var $details = $('details'),
				len = this._togglers.length,
				open = !this.isOpen();

			this._changeProp($details, open);
			this.setOpen(open);

			while (len--) {
				this._setTitle(this._togglers[len]);
			}
		},

		/**
		* Initializes the toggle control buttons
		* @memberof pe.fn.expandcollapseall
		* @function
		* @param {jQuery object} elm The object that will hold the toggle control buttons
		* @param {object} opts Configuration options for the toggle controls
		*/
		_initTogglers : function (elm, opts) {
			var li,
				toggler,
				types,
				ul = document.createElement('ul');

			// Make sure there is at least one toggle control
			if (!opts.togglers || (!opts.togglers.toggle && !opts.togglers.open && !opts.togglers.close)){
				opts.togglers.toggle = true;
			}

			// Create the requested togglers and add to the page
			types = _pe.array.keys(opts.togglers);
			for(var i = 0, length = types.length; i < length; i++) {
				if (opts.togglers[types[i]] === true) {
					toggler = this._createToggler(types[i], opts);
					li = document.createElement('li');
					li.appendChild(toggler[0]);
					ul.appendChild(li);
					this._togglers.push(toggler);
				}
			}
			ul.className = 'button-group';
			elm.append(ul);

			// Accent the first button of the toggler group
			if (opts.accentFirst === true) {
				$(ul).find('li:first-child > .button').addClass('button-accent');
			}
		},

		/**
		* Initializes the accordion behaviour of details elements:
		* 1. Only one details open at a time
		* 2. Nested details clicks do not close their parent details element
		* @memberof pe.fn.expandcollapseall
		* @function
		*/
		_initAccordion : function () {
			_pe.document.on('click', 'details summary', function () {
				var detailClicked = this.parentNode,
					len,
					$detail,
					$details = $('details'),
					$detailParent = $(detailClicked).parents('details'),
					$otherDetails;

				// Check for nested details element
				if ($detailParent.length !== 0) {
					$otherDetails = $();
					len = $details.length;
					while (len--) {
						$detail = $details.eq(len);
						// Close nested details elements with the same details parent.	This includes child details elements as well.
						if ($details[len] !== detailClicked && $detail.parents('details')[0] === $detailParent[0]) {
							$otherDetails = $otherDetails.add($detail).add($detail.find('details'));
						}
					}
				} else {
					$otherDetails = $details.not(detailClicked);
				}

				// Close the other details elements
				if ($otherDetails.length !== 0) {
					_pe.fn.expandcollapseall._changeProp($otherDetails, false);
				}
			});
		},

		/**
		* Initializes the print behaviour of details elements: details open automatically before the page is printed
		* @memberof pe.fn.expandcollapseall
		* @function
		*/
		_initPrint : function () {
			var mediaQuery;

			// Native event support
			_pe.window.on('beforeprint', $.proxy(function () {
				this.setOpen(false);
				this.toggle();
			}, this));

			// Fallback for browsers that don't support 'beforeprint' event
			if (typeof window.matchMedia !== 'undefined') {
				mediaQuery = window.matchMedia('print');
				if (typeof mediaQuery.addListener !== 'undefined') {
					mediaQuery.addListener(function (query) {
						if (query.matches) {
							_pe.window.trigger('beforeprint');
						}
					});
				}
			}

			// Polyfill open using CSS
			$('details').addClass('print-open');
		},

		/**
		* Changes the open/closed property of details elements.  This causes native and polyfill
		* details elements to open or close.
		* @memberof pe.fn.expandcollapseall
		* @function
		* @param {jQuery Object} $details Details elements that will have their 'open' property changed.
		* @param {boolean} open Boolean value of the 'open' property.
		*/
		_changeProp : function ($details, open) {
			$details.prop('open', open);
			if (this._isPolyfill) {
				$details.children('summary').attr('aria-expanded', open);
				if (open) {
					$details.addClass('open');
					$details.children(':not(summary)').show();
				} else {
					$details.removeClass('open');
					$details.children(':not(summary)').hide();
				}
			}
		},

		/**
		* Creates a single toggle control button and bind click event behaviour
		* @memberof pe.fn.expandcollapseall
		* @function
		* @param {string} type The type of toggle control: [open|close|toggle]
		* @param {object} opts Configuration options for the toggle controls
		*/
		_createToggler : function (type, opts) {
			var $toggler = $('<a>').attr({
					'href': '#',
					'role': 'button',
					'class': 'button',
					'aria-controls': this._getAriaControls(),
					'data-type': type,
					'data-title-close': opts.text.titleClose,
					'data-title-open': opts.text.titleOpen
				}).text(opts.text[type]);

			$toggler.on('click', $.proxy(function (event) {
				this.setOpen(type === 'open' ? false : type === 'close' ? true : this.isOpen());
				this.toggle();
				event.preventDefault();
				event.target.focus();
			}, this));

			this._setTitle($toggler);
			return $toggler;
		},

		/**
		* Creates the space separated list of details 'id' attributes.	Used by the 'aria-controls' attribute of the toggle button(s).
		* @memberof pe.fn.expandcollapseall
		* @function
		* @return {string} Space separated list of details 'id' attributes.
		*/
		_getAriaControls : function () {
			var detail,
				details,
				ids = '',
				len;

			if (this._aria_controls === null) {
				details = document.getElementsByTagName('details');
				len = details.length;
				while (len--) {
					detail = details[len];
					if (detail.id === '') {
						detail.id = 'details_' + len;
					}
					ids += detail.id + ' ';
				}
				this._aria_controls = ids.slice(0, -1);
			}
			return this._aria_controls;
		},

		/**
		* Updates the title attribute of a given toggle control element.  Title is based on the type of toggle control and the current open/closed state of the plugin.
		* @memberof pe.fn.expandcollapseall
		* @function
		* @return {jQuery object} toggler The toggle control that needs its title attribute updated
		*/
		_setTitle : function (toggler) {
			var type = toggler.data('type');
			toggler[0].title = type === 'close' || (type !== 'open' && this.isOpen()) ? toggler.data('title-close') : toggler.data('title-open');
		}
	};
	window.pe = _pe;
	return _pe;
}
(jQuery));
