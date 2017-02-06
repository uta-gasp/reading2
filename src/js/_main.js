// Requires:
//      Firebase

var Reading = Reading || {};

// "components" contains selectors for each component
Reading.init = function (components) {

    Reading.loadingCallbacks.forEach( callback => { callback(); } );

    // DB
    if (typeof firebase !== 'undefined') {
        Reading.firebase = firebase.database().ref( 'school2' );
    }
    else {
        alert( 'Please connect to the internet and reload the page' );
    }

    // setup
    var syllabifier = new Reading.Syllabifier({
    });

    var textSplitter = new Reading.TextSplitter({
        root: components.text
    }, {
        prepareForSyllabification: syllabifier.prepareForSyllabification.bind( syllabifier )
    });

    var text = new Reading.Text({
        root: components.text
    }, {
        splitText: textSplitter.split.bind( textSplitter )
    });

    var visualizationCallbacks = {
        shown: text.hide,
        hidden: function () {
            if (text.initialVisibility()) {
                text.show();
            }
        }
    };

    Reading.Visualization.init( components.visualization, visualizationCallbacks );

    Reading.WordList.instance = new Reading.WordList( { container: components.wordlist } );

    var path = new Reading.Path({
        root: components.visualization
    });
    var wordGazing = new Reading.WordGazing({
        root: components.visualization,
        spacingNames: text.spacings
    });
    var rtv = new Reading.RTV({
        root: components.visualization
    });
    var gazeReplay = new Reading.GazeReplay({
        root: components.visualization
    });

    var statistics = new Reading.Statistics({
        root: components.statistics,
        wordClass: textSplitter.wordClass
    }, {
        getTextSetup: text.getSetup.bind( text ),
        getInteractionSetup: syllabifier.getSetup.bind( syllabifier )
    });

    syllabifier.events.addListener( 'syllabified', statistics.onSyllabified.bind( statistics ) );
    syllabifier.events.addListener( 'pronounced', statistics.onPronounced.bind( statistics ) );

    var textEditor = new Reading.TextEditor({
        root: components.textEditor,
        text: components.text
    }, {
        splitText: textSplitter.split.bind( textSplitter ),
        getText: text.getText.bind( text ),
        setText: text.setText.bind( text )
    });

    var controls = new Reading.Controls({
        root: components.controls
    }, {
        getTextTitles: () => { return text.getTextTitles(); },
        getSpacings: () => { return text.spacings; },
        switchText: text.switchText.bind( text ),
        switchSpacing: text.switchSpacing.bind( text ),
        selectSession: path.queryData.bind( path ),
        selectCondition: wordGazing.queryData.bind( wordGazing ),
        selectFile: path.queryFile.bind( path ),
        simulate: rtv.queryData.bind( rtv ),
        gazeReplay: gazeReplay.queryData.bind( gazeReplay ),
        nextPage: () => {
            text.nextPage();
            GazeTargets.updateTargets();
        },
        hasNextPage: text.hasNextPage.bind( text ),
    });

    var options = new Reading.Options({
        root: components.options,
        text: components.textContainer + ' ' + components.text
    }, {    // services
        userName: function (value) { return value === undefined ?
            statistics.userName :
            (statistics.userName = value );
        },
        texts: function (value) { return value === undefined ?
            text.texts :
            text.setTexts( value );
        },
        textID: function (value) { return value === undefined ?
            text.getCurrentTextIndex() :
            text.switchText( value );
        },
        textAlign: function (value) { return value === undefined ?
            text.getAlign() :
            text.setAlign( value );
        },
        textSpacing: function (value) { return value === undefined ?
            text.getCurrentSpacingIndex() :
            text.switchSpacing( value );
        },
        showPointer: function (value) { return value === undefined ?
            GazeTargets.getSettings( 'pointer/show' ) :
            GazeTargets.updateSettings( { pointer: { show: value } } );
        },
        highlightWord: function (value) { return value === undefined ?
            syllabifier.highlightingEnabled :
            (syllabifier.highlightingEnabled = value);
        },
        syllabificationEnabled: function (value) { return value === undefined ?
            syllabifier.syllabificationEnabled :
            (syllabifier.syllabificationEnabled = value);
        },
        syllabificationThreshold: function (value) { return value === undefined ?
            syllabifier.syllabificationThreshold :
            (syllabifier.syllabificationThreshold = value);
        },
        speechEnabled: function (value) { return value === undefined ?
            syllabifier.speechEnabled :
            (syllabifier.speechEnabled = value);
        },
        speechThreshold: function (value) { return value === undefined ?
            syllabifier.speechThreshold :
            (syllabifier.speechThreshold = value);
        },
        hideText: function (value) { return value === undefined ?
            !text.initialVisibility() :
            text.initialVisibility( !value );
        },
        path: {
            colorMetric: function (value) { return value === undefined ?
                path.colorMetric :
                (path.colorMetric = value);
            },
            mapping: function (value) { return value === undefined ?
                path.mapping :
                (path.mapping = value);
            },
            showIDs: function (value) { return value === undefined ?
                path.showIDs :
                (path.showIDs = value);
            },
            showConnections: function (value) { return value === undefined ?
                path.showConnections :
                (path.showConnections = value);
            },
            showSaccades: function (value) { return value === undefined ?
                path.showSaccades :
                (path.showSaccades = value);
            },
            showFixations: function (value) { return value === undefined ?
                path.showFixations :
                (path.showFixations = value);
            },
            showOriginalFixLocation: function (value) { return value === undefined ?
                path.showOriginalFixLocation :
                (path.showOriginalFixLocation = value);
            }
        },
        wordGazing: {
            colorMetric: function (value) { return value === undefined ?
                wordGazing.colorMetric :
                (wordGazing.colorMetric = value);
            },
            showFixations: function (value) { return value === undefined ?
                wordGazing.showFixations :
                (wordGazing.showFixations = value);
            },
            uniteSpacings: function (value) { return value === undefined ?
                wordGazing.uniteSpacings :
                (wordGazing.uniteSpacings = value);
            },
            showRegressions: function (value) { return value === undefined ?
                wordGazing.showRegressions :
                (wordGazing.showRegressions = value);
            }
        }
    }, {    // utils
        editText: textEditor.show.bind( textEditor ),
        getTextTitle: text.getTextTitle.bind( text )
    });

    /*var gazeTargetsManager = */new Reading.GazeTargetsManager({
        trackingStarted: function () {
            syllabifier.init();
            text.reset();
            statistics.init();
            options.lock();
            controls.lock();
            if (!text.initialVisibility()) {
                text.show();
            }
        },
        trackingStopped: function () {
            syllabifier.reset();
            statistics.save();
            options.unlock();
            controls.unlock();
            if (!text.initialVisibility()) {
                text.hide();
            }
            text.reset();
        },
        wordFocused: function (word) {
            syllabifier.setFocusedWord( word );
            statistics.setFocusedWord( word, text.getPageIndex() );
        },
        wordLeft: function (/*word*/) {
            syllabifier.setFocusedWord( null );
            statistics.setFocusedWord( null );
        },
        fixation: fix => {
            statistics.logFixation( fix, text.getPageIndex() );
        },
        updateControls: controls.onStateUpdated.bind( controls ),
    });
};

Reading.loaded = function (callback) {
    Reading.loadingCallbacks.push( callback );
};

Reading.loadingCallbacks = [];