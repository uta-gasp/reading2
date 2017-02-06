// Requires:
//      shortcut
//      GazeTargets
//      utils/logger

(function (app) { 'use strict';

    // Initializes and sets callbacks for the app controls
    // Constructor arguments:
    //      options: {
    //          root:               - controls container element ID
    //      }
    //      services: {
    //          getTextTitles ()    - retrieve the list of text titles
    //          getSpacings ()      - retrieve the list of spacings
    //          switchText (id)     - switch the text to "id"
    //          switchSpacing (id)  - switch the spacing to "id"
    //          selectSession ()    - show a DB session selection dialog
    //          selectCondition ()  - show a condition selection dialog
    //          selectFile ()       -
    //          simulate ()         -
    //          gazeReplay ()       -
    //          nextPage ()         -
    //          hasNextPage ()      -
    //      }
    function Controls (options, services) {
        this.root = document.querySelector( options.root );

        _services = services;

        var logError = app.Logger.moduleErrorPrinter( 'Controls' );
        _services.getTextTitles = _services.getTextTitles || logError( 'getTextTitles' );
        _services.getSpacings = _services.getSpacings || logError( 'getSpacings' );
        _services.switchText = _services.switchText || logError( 'switchText' );
        _services.switchSpacing = _services.switchSpacing || logError( 'switchSpacing' );
        _services.selectSession = _services.selectSession || logError( 'selectSession' );
        _services.selectCondition = _services.selectCondition || logError( 'selectCondition' );
        _services.selectFile = _services.selectFile || logError( 'selectFile' );
        _services.simulate = _services.simulate || logError( 'simulate' );
        _services.gazeReplay = _services.gazeReplay || logError( 'gazeReplay' );
        _services.nextPage = _services.nextPage || logError( 'nextPage' );
        _services.hasNextPage = _services.hasNextPage || logError( 'hasNextPage' );

        //var container = document.querySelector( this.root );

        _device = this.root.querySelector( '.device' );

        _options = this.root.querySelector( '.options' );
        _options.addEventListener('click', function () {
            GazeTargets.ETUDriver.showOptions();
        });

        _calibrate = this.root.querySelector( '.calibrate' );
        _calibrate.addEventListener('click', function () {
            GazeTargets.ETUDriver.calibrate();
            setButtonHidden( _calibrate, true );
        });

        _toggle = this.root.querySelector( '.toggle' );
        _toggle.addEventListener('click', function () {
            setButtonDisabled( _toggle, true );
            setButtonHidden( _calibrate, true );
            GazeTargets.ETUDriver.toggleTracking();
        });

        _nextPage = this.root.querySelector( '.nextPage' );
        _nextPage.addEventListener('click', () => {
            if (_services.hasNextPage()) {
                _services.nextPage();
                this._updateNextPageButton();
            }
            else {
                GazeTargets.ETUDriver.toggleTracking();
            }
        });

        _thanks = this.root.querySelector( '.thanks' );

        _textSwitchers = this.root.querySelector( '.text' );
        var textTitles = _services.getTextTitles();
        for (let i = 0; i < textTitles.length; i += 1) {
            let swither = document.createElement('div');
            swither.className = 'button';
            swither.textContent = 'Text ' + (i + 1);
            swither.addEventListener('click', getTextSwitcherHandler( i ));
            if (i === 0) {
                swither.classList.add('selected');
            }
            _textSwitchers.appendChild( swither );
        }

        _spacingSwitchers = this.root.querySelector( '.spacing' );
        var spacings = _services.getSpacings();
        for (let i = 0; i < spacings.length; i += 1) {
            let swither = document.createElement('div');
            swither.className = 'button';
            swither.textContent = spacings[ i ];
            swither.addEventListener('click', getSpacingSwitcherHandler( i ));
            if (i === 0) {
                swither.classList.add('selected');
            }
            _spacingSwitchers.appendChild( swither );
        }

        _loadSession = this.root.querySelector( '.loadSession' );
        _loadSession.addEventListener('click', function () {
            _services.selectSession();
        });

        _loadCondition = this.root.querySelector( '.loadCondition' );
        _loadCondition.addEventListener('click', function () {
            _services.selectCondition();
        });

        _loadFile = this.root.querySelector( '.loadFile' );
        _loadFile.addEventListener('click', function () {
            _services.selectFile();
        });

        _simulate = this.root.querySelector( '.simulate' );
        _simulate.addEventListener('click', function () {
            _services.simulate( true );
        });

        _gazeReplay = this.root.querySelector( '.gazeReplay' );
        _gazeReplay.addEventListener('click', function () {
            _services.gazeReplay( true );
        });

        shortcut.add( 'space', function() {
            if (!_calibrate.classList.contains( 'disabled' ) && !_calibrate.classList.contains( 'hidden' )) {
                _calibrate.click();
            }
            else if (!_toggle.classList.contains( 'disabled' ) && !_toggle.classList.contains( 'hidden' )) {
                _toggle.click();
            }
            else if (!_nextPage.classList.contains( 'disabled' ) && !_nextPage.classList.contains( 'hidden' )) {
                _nextPage.click();
            }
        }, {
            'disable_in_input': true
        });

        _connectionTimeout = setTimeout(function () {
            _device.textContent = 'Disconnected';
        }, 3000);
    }

    Controls.prototype.lock = function () {
        setButtonBlockDisabled( _textSwitchers, true );
        setButtonBlockDisabled( _spacingSwitchers, true );
        _loadSession.classList.add( 'disabled' );
        _loadCondition.classList.add( 'disabled' );
        _loadFile.classList.add( 'disabled' );
        _simulate.classList.add( 'disabled' );
        _gazeReplay.classList.add( 'disabled' );
    };

    Controls.prototype.unlock = function () {
        setButtonBlockDisabled( _textSwitchers, false );
        setButtonBlockDisabled( _spacingSwitchers, false );
        _loadSession.classList.remove( 'disabled' );
        _loadCondition.classList.remove( 'disabled' );
        _loadFile.classList.remove( 'disabled' );
        _simulate.classList.remove( 'disabled' );
        _gazeReplay.classList.remove( 'disabled' );
    };

    Controls.prototype.onStateUpdated = function (state) {
        if (state.device) {
            // if (_device.textContent === 'Connecting' && state.device) {
            //     _calibrate.click();
            // }
            _device.textContent = state.device;
            clearTimeout( _connectionTimeout );
        }
        else if (!state.isConnected) {
            _device.textContent = 'Disconnected';
        }

        setButtonDisabled( _options, !state.isServiceRunning || state.isTracking || state.isBusy);
        setButtonDisabled( _calibrate, !state.isConnected || state.isTracking || state.isBusy);
        setButtonHidden( _toggle, !state.isCalibrated || state.isTracking || state.isStopped || state.isBusy);
        setButtonDisabled( _toggle, !state.isCalibrated || state.isBusy);
        setButtonHidden( _nextPage, !state.isTracking );
        setButtonDisabled( _nextPage, !state.isTracking );
        setButtonHidden( _thanks, !state.isStopped );

        _toggle.textContent = state.isTracking ? 'Stop' : 'Aloita';

        if (state.isTracking) {
            this.root.classList.remove( 'centered' );
            this.root.classList.add( 'bottom-right' );
            this._updateNextPageButton();
        }
        else {
            this.root.classList.remove( 'bottom-right' );
            this.root.classList.add( 'centered' );
        }
    };

    Controls.prototype._updateNextPageButton = function () {
        if (!_nextPage.classList.contains('hidden') && !_services.hasNextPage()) {
            _nextPage.textContent = 'Lopeta';
        }
        else {
            _nextPage.textContent = 'Jatka';
        }
    }

    // private

    function setButtonDisabled(button, isDisabled) {
        if (isDisabled) {
            button.classList.add('disabled');
        } else {
            button.classList.remove('disabled');
        }
    }

    function setButtonHidden(button, isHidden) {
        if (isHidden) {
            button.classList.add('hidden');
        } else {
            button.classList.remove('hidden');
        }
    }

    function setButtonBlockDisabled(container, isDisabled) {
        var switches = container.childNodes;
        for (var i = 0; i < switches.length; i += 1) {
            setButtonDisabled( switches.item(i), isDisabled);
        }
    }

    function getTextSwitcherHandler(index) {
        return function () {
            _services.switchText( index );
            select(this, _textSwitchers);
        };
    }

    function getSpacingSwitcherHandler(index) {
        return function () {
            _services.switchSpacing( index );
            select(this, _spacingSwitchers);
        };
    }

    function select(button, container) {
        var switches = container.childNodes;
        for (var i = 0; i < switches.length; i += 1) {
            switches.item(i).classList.remove('selected');
        }
        button.classList.add('selected');
    }

    var _services;
    var _device;
    var _options;
    var _calibrate;
    var _toggle;
    var _nextPage;
    var _thanks;

    var _textSwitchers;
    var _spacingSwitchers;
    var _loadSession;
    var _loadCondition;
    var _loadFile;
    var _simulate;
    var _gazeReplay;

    var _connectionTimeout;

    app.Controls = Controls;

})( this.Reading || module.exports );
