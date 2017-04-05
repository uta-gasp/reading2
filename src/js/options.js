// Requires:
//      utils/logger

(function (app) { 'use strict';

    // Controller for the text options side-slider
    // Constructor arguments:
    //      options: {
    //          root:   - slideout element ID
    //          text:   - full text selector
    //      }
    //      services: {             - get/set services
    //          userName (string)
    //          texts (array of pages texts)
    //          textID (index)
    //          hideText (bool)
    //          textAlign (0..1)
    //          textSpacing (0..4)
    //          showPointer (bool)
    //          highlightWord (bool)
    //          syllabificationEnabled (bool)
    //          syllabificationThreshold (number)
    //          speechEnabled (bool)
    //          speechThreshold (number)
    //          path {
    //              colorMetric (index)
    //              mapping (index)
    //              showIDs (bool)
    //              showConnections (bool)
    //              showSaccades (bool)
    //              showFixations (bool)
    //              showOriginalFixLocation (bool)
    //          }
    //          wordGazing {
    //              colorMetric (index)
    //              showFixations (bool)
    //              uniteSpacings (bool)
    //              showRegressions (bool)
    //          }
    //      }
    //      utils: {
    //          editText
    //          getTextTitle
    //      }
    function Options (options, services, utils) {

        const root = options.root || '#options';

        this._slideout = document.querySelector( root );

        const logError = app.Logger.moduleErrorPrinter( 'Options' );

        _services = services;

        _services.userName = _services.userName || logError( 'userName' );
        _services.modifiedTexts = _services.modifiedTexts || logError( 'modifiedTexts' );
        _services.textID = _services.textID || logError( 'textID' );
        _services.hideText = _services.hideText || logError( 'hideText' );
        _services.textAlign = _services.textAlign || logError( 'textAlign' );
        _services.textSpacing = _services.textSpacing || logError( 'textSpacing' );

        _services.showPointer = _services.showPointer || logError( 'showPointer' );
        _services.highlightWord = _services.highlightWord || logError( 'highlightWord' );
        _services.syllabificationEnabled = _services.syllabificationEnabled || logError( 'syllabificationEnabled' );
        _services.speechEnabled = _services.speechEnabled || logError( 'speechEnabled' );

        _services.path = _services.path || {};
        _services.path.colorMetric = _services.path.colorMetric || logError( 'path.colorMetric"' );
        _services.path.mapping = _services.path.mapping || logError( 'path.mapping"' );
        _services.path.showConnections = _services.path.showConnections || logError( 'path.showConnections' );
        _services.path.showSaccades = _services.path.showSaccades || logError( 'path.showSaccades' );
        _services.path.showFixations = _services.path.showFixations || logError( 'path.showFixations' );
        _services.path.showOriginalFixLocation = _services.path.showOriginalFixLocation || logError( 'path.showOriginalFixLocation' );

        _services.wordGazing = _services.wordGazing || {};
        _services.wordGazing.colorMetric = _services.wordGazing.colorMetric || logError( 'wordGazing.colorMetric' );
        _services.wordGazing.showFixations = _services.wordGazing.showFixations || logError( 'wordGazing.showFixations' );
        _services.wordGazing.uniteSpacings = _services.wordGazing.uniteSpacings || logError( 'wordGazing.uniteSpacings' );
        _services.wordGazing.showRegressions = _services.wordGazing.showRegressions || logError( 'wordGazing.showRegressions' );

        _utils = utils;

        const cssRules = [
            /*{
                name:        rule CSS name
                type:        the type of control to represent the rule
                selector:    rule selector
                id:          control ID
                prefix:      the rule value prefix not to be shown in the control
                suffix:      the rule value suffix not to be shown in the control
                value:     [auto-filled] rule value
                initial:   [auto-filled] initial rule value
                editor:    [auto-filled] rule control
            }*/
            { name: 'color', type: 'color', selector: options.text, id: 'text', prefix: '#', suffix: '' },
            { name: 'color', type: 'color', selector: options.text + ' .currentWord', id: 'currentWord', prefix: '#', suffix: '' },
            { name: 'font-size', type: 'string', selector: options.text, id: 'fontSize', prefix: '', suffix: '' },
            //{ name: 'line-height', type: 'string', selector: options.text, id: 'lineHeight', prefix: '', suffix: '' },
        ];

        this._style = document.createElement( 'style' );
        document.body.appendChild( this._style );

        const texts = this._slideout.querySelector( '#textID' );
        _utils.textTitles().forEach( (title, id) => {
            let option = document.createElement( 'option' );
            option.value = id;
            option.textContent = title;
            texts.appendChild( option );
        });

        const editText = this._slideout.querySelector( '.editText' );
        editText.addEventListener( 'click', () => {
            _utils.editText();
        });

        const apply = this._slideout.querySelector( '.save' );
        apply.addEventListener( 'click', () => {
            getRulesFromEditors( this._style, cssRules );
            this._slideout.classList.remove( 'expanded' );

            saveSettings( cssRules );
        });

        const close = this._slideout.querySelector( '.close' );
        close.addEventListener( 'click', () => {
            this._slideout.classList.remove( 'expanded' );
        });

        const reset = this._slideout.querySelector( '.reset' );
        reset.addEventListener( 'click', () => {
            localStorage.removeItem( 'options' );
            location.reload();
        });

        const slideoutTitle = this._slideout.querySelector( '.title');
        slideoutTitle.addEventListener( 'click', () => {
            this._slideout.classList.toggle( 'expanded' );
            setRulesToEditors( cssRules );
        });

        window.addEventListener( 'load', () => {
            loadSettings( cssRules );
            this._style.innerHTML = cssRules.reduce( function (css, rule) {
                return css + rule.selector + ' { ' + rule.name + ': ' + rule.initial + rule.suffix + ' !important; } ';
            }, '');

            obtainInitialRules( cssRules );

            bindSettingsToEditors( this._slideout );
            bindRulesToEditors( cssRules, this._slideout );
        });
    }

    // Disables editing
    Options.prototype.lock = function () {
        this._slideout.classList.add( 'locked' );
    };

    // Enables editing
    Options.prototype.unlock = function () {
        this._slideout.classList.remove( 'locked' );
    };

    // private

    var _services;
    var _utils;

    const OPIONS_NAME = 'reading2';

    function loadSettings(cssRules) {
        var options = JSON.parse( localStorage.getItem( OPIONS_NAME ) );
        if (!options) {
            return;
        }

        var services = _services;

        var pop = function (storage, srv) {
            for (var name in storage) {
                if (name === 'css') {
                    continue;
                }
                else if (Array.isArray( storage[ name ] )) {
                    srv[ name ]( storage[ name ] );
                }
                else if (typeof storage[ name ] === 'object') {
                    pop( storage[ name ], srv[ name ] );
                }
                else if (srv[ name ]) {
                    srv[ name ]( storage[ name ] );
                }
            }
        };

        pop( options, services );

        // for (var name in options) {
        //     if (_services[ name ]) {
        //         _services[ name ]( options[name] );
        //     }
        // }

        if (options.css) {
            var ruleInitilization = (rule) => {
                if (rule.selector === parts[0] && rule.name === parts[1]) {
                    rule.initial = options.css[ savedRule ];
                }
            };
            for (var savedRule in options.css) {
                var parts = savedRule.split( '____' );
                cssRules.forEach( ruleInitilization );
            }
        }
    }

    function saveSettings(cssRules) {
        var options = {};
        var services = _services;

        var push = function (storage, srv) {
            for (var name in srv) {
                if (typeof srv[ name ] === 'function') {
                    storage[ name ] = srv[ name ]();
                }
                else if (typeof srv[ name ] === 'object') {
                    storage[ name ] = { };
                    push( storage[ name ], srv[ name ] );
                }
            }
        };

        push( options, services );

        options.css = {};
        cssRules.forEach( function (rule) {
            options.css[ rule.selector + '____' + rule.name ] = rule.value;
        });

        localStorage.setItem( OPIONS_NAME, JSON.stringify( options) );
    }

    function componentToHex( c ) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    function rgbToHex( r, g, b ) {
        return '#' + componentToHex( r ) + componentToHex( g ) + componentToHex( b );
    }

    function cssColorToHex( cssColor ) {

        var colorRegex = /^\D+(\d+)\D+(\d+)\D+(\d+)\D+$/gim;
        var colorComps = colorRegex.exec( cssColor );

        return rgbToHex(
            parseInt( colorComps[ 1 ] ),
            parseInt( colorComps[ 2 ] ),
            parseInt( colorComps[ 3 ] ) );
    }

    function cssToJS( cssName ) {

        var dashIndex = cssName.indexOf( '-' );
        while (dashIndex >= 0) {
            var char = cssName.charAt( dashIndex + 1);
            cssName = cssName.replace( '-' + char,  char.toUpperCase() );
            dashIndex = cssName.indexOf( '-' );
        }
        return cssName;
    }

    function obtainInitialRules( rules ) {

        for (var s = 0; s < document.styleSheets.length; s++) {
            var sheet = document.styleSheets[ s ];
            for (var r = 0; r < sheet.cssRules.length; r++) {
                var rule = sheet.cssRules[ r ];
                for (var c = 0; c < rules.length; c++) {
                    var customRule = rules[ c ];
                    if (rule.selectorText === customRule.selector) {
                        if (customRule.initial === undefined) {
                            if (customRule.type === 'color') {
                                customRule.initial = cssColorToHex( rule.style.color );
                            }
                            else if (customRule.type === 'string') {
                                customRule.initial = rule.style[ cssToJS( customRule.name ) ];
                            }
                        }
                        customRule.value = customRule.initial;
                    }
                }
            }
        }
    }

    function bindRulesToEditors( rules, root ) {

        for (var i = 0; i < rules.length; i++) {
            var rule = rules[ i ];
            rule.editor = root.querySelector( '#' + rule.id );

            if (rule.type === 'color') {
                rule.editor.value = rule.initial;  //color.fromString( rule.initial );
            }
            else if (rule.type === 'string') {
                rule.editor.value = rule.initial;
            }
        }
    }

    function getRulesFromEditors( style, rules ) {

        var styleText = '';
        for (var i = 0; i < rules.length; i++) {
            var rule = rules[ i ];
            if (rule.type === 'color') {
                rule.value = rule.editor.value; //'#' + rule.editor.color;
            }
            else if (rule.type === 'string') {
                rule.value = rule.editor.value;
            }
            styleText += rule.selector + ' { ' + rule.name + ': ' + rule.value + rule.suffix + ' !important; } ';
        }
        style.innerHTML = styleText;
    }

    function setRulesToEditors( rules ) {

        for (var i = 0; i < rules.length; i++) {
            var rule = rules[ i ];
            if (rule.type === 'color') {
                rule.editor.value = rule.value;//color.fromString( rules.value );
            }
            else if (rule.type === 'string') {
                rule.editor.value = rule.value;
            }
        }
    }

    function bindSettingsToEditors( root ) {
        var bindCheckbox = (id, service) => {
            var flag = root.querySelector( '#' + id );
            flag.checked = service();
            flag.addEventListener( 'click', function () {
                service( this.checked );
            });
        };

        var bindSelect = (id, service) => {
            var select = root.querySelector( '#' + id );
            select.selectedIndex = service();
            select.addEventListener( 'change', function () {
                service( this.selectedIndex );
            });
        };

        var bindValue = (id, service) => {
            var text = root.querySelector( '#' + id );
            text.value = service();
            text.addEventListener( 'change', function () {
                service( this.value );
            });
        };

        var bindRadios = (name, service) => {
            var radioButtons = Array.from( root.querySelectorAll( `input[name=${name}]` ) );
            radioButtons.forEach( (radio, index) => {
                radio.checked = service() === index;
                radio.addEventListener( 'change', function () {
                    service( this.value );
                });
            });
        };

        bindValue( 'userName', _services.userName );
        bindSelect( 'textID', _services.textID );
        bindCheckbox( 'hiddenText', _services.hideText );
        bindRadios( 'textAlign', _services.textAlign );
        bindRadios( 'lineSpacing', _services.textSpacing );

        bindCheckbox( 'showPointer', _services.showPointer );
        bindCheckbox( 'syllabificationEnabled', _services.syllabificationEnabled );
        bindValue( 'syllabificationThreshold', _services.syllabificationThreshold );
        bindCheckbox( 'syllabificationSmartThreshold', _services.syllabificationSmartThreshold );
        bindValue( 'syllabificationSmartThresholdMin', _services.syllabificationSmartThresholdMin );
        bindValue( 'syllabificationSmartThresholdMax', _services.syllabificationSmartThresholdMax );
        bindValue( 'syllabificationSmartThresholdFactor', _services.syllabificationSmartThresholdFactor );
        bindCheckbox( 'speechEnabled', _services.speechEnabled );
        bindValue( 'speechThreshold', _services.speechThreshold );
        bindCheckbox( 'highlightWord', _services.highlightWord );

        /*
        bindSelect( 'path_mapping', _services.path.mapping );

        bindSelect( 'path_colorMetric', _services.path.colorMetric );
        bindCheckbox( 'path_showIDs', _services.path.showIDs );
        bindCheckbox( 'path_showConnections', _services.path.showConnections );
        bindCheckbox( 'path_showSaccades', _services.path.showSaccades );
        bindCheckbox( 'path_showFixations', _services.path.showFixations );
        bindCheckbox( 'path_showOriginalFixLocation', _services.path.showOriginalFixLocation );

        bindSelect( 'wordGazing_colorMetric', _services.wordGazing.colorMetric );
        bindCheckbox( 'wordGazing_showFixations', _services.wordGazing.showFixations );
        bindCheckbox( 'wordGazing_uniteSpacings', _services.wordGazing.uniteSpacings );
        bindCheckbox( 'wordGazing_showRegressions', _services.wordGazing.showRegressions );
        */
    }

    app.Options = Options;

})( this.Reading || module.this.exports );
