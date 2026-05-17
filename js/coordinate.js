(function() {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Constants                                                         */
  /* ------------------------------------------------------------------ */

  const ALL_SQUARES = (() => {
    const f = 'abcdefgh', r = '12345678', a = [];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) a.push(f[j] + r[i]);
    return a;
  })();

  /* ------------------------------------------------------------------ */
  /*  Internal state                                                    */
  /* ------------------------------------------------------------------ */

  let _state = {
    side: null,
    mode: 'a',
    score: 0,
    total: 0,
    target: null,
    active: false,
    waitingCorrect: false,
    timerSeconds: 0,
    timeRemaining: 0,
    timerInterval: null,
    pool: [],
    startTime: 0
  };

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */

  function _t(key) {
    if (typeof t === 'function') return t(key);
    const dict = {
      findSquare: 'Find',
      correct: 'Correct!',
      wrong: 'Wrong! It was',
      go: 'Go',
      playAsWhite: 'Play as White',
      playAsBlack: 'Play as Black',
      modeA: 'Mode A: Find Square',
      modeB: 'Mode B: Name Square'
    };
    return dict[key] || key;
  }

  function _getEl(id) {
    return document.getElementById(id);
  }

  function _shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function _refillPool() {
    _state.pool = _shuffle(ALL_SQUARES);
  }

  function _pickTarget() {
    if (_state.pool.length === 0) _refillPool();
    return _state.pool.pop();
  }

  function _findSquareEl(grid, sq) {
    if (!grid) return null;
    const squares = grid.querySelectorAll('.square');
    for (let i = 0; i < squares.length; i++) {
      if (squares[i].getAttribute('data-square') === sq) return squares[i];
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Board rendering (createElement for mock-DOM compatibility)        */
  /* ------------------------------------------------------------------ */

  function _renderBoard() {
    const isBlack = _state.side === 'black';
    const files = isBlack ? 'hgfedcba' : 'abcdefgh';
    const ranks = isBlack ? '12345678' : '87654321';

    const grid = _getEl('coordinateBoardGrid');
    if (!grid) return;

    grid.innerHTML = '';

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isLight = (r + c) % 2 === 0;
        const sq = files[c] + ranks[r];

        const el = document.createElement('div');
        el.className = 'square ' + (isLight ? 'light' : 'dark');
        el.setAttribute('data-square', sq);
        el.style.width = '48px';
        el.style.height = '48px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.cursor = 'pointer';
        el.style.background = isLight ? '#b0b0b0' : '#808080';

        el.addEventListener('click', function() {
          CoordinateModule.submitAnswer(this.getAttribute('data-square'));
        });

        grid.appendChild(el);
      }
    }
  }

  function _updateLabels() {
    const isBlack = _state.side === 'black';
    const rowLabels = isBlack ? '12345678' : '87654321';
    const colLabels = isBlack ? 'hgfedcba' : 'abcdefgh';

    const wrapper = _getEl('coordinateBoardWrapper');
    if (!wrapper) return;

    const rowContainer = wrapper.querySelector('.board-row-labels');
    const colContainer = wrapper.querySelector('.board-col-labels');

    if (rowContainer) {
      rowContainer.innerHTML = '';
      for (let i = 0; i < rowLabels.length; i++) {
        const span = document.createElement('span');
        span.textContent = rowLabels[i];
        rowContainer.appendChild(span);
      }
    }

    if (colContainer) {
      colContainer.innerHTML = '';
      for (let i = 0; i < colLabels.length; i++) {
        const span = document.createElement('span');
        span.textContent = colLabels[i];
        colContainer.appendChild(span);
      }
    }
  }

  function _highlightSquare(sq, type) {
    const grid = _getEl('coordinateBoardGrid');
    if (!grid) return;
    const el = _findSquareEl(grid, sq);
    if (!el) return;

    if (type === 'correct') {
      el.style.background = '#34c759';
    } else if (type === 'wrong') {
      el.style.background = '#ff453a';
      el.classList.add('wrong-tap');
    } else if (type === 'selected') {
      el.classList.add('glass-highlight');
    }
  }

  function _clearHighlights() {
    const grid = _getEl('coordinateBoardGrid');
    if (!grid) return;
    const squares = grid.querySelectorAll('.square');
    for (let i = 0; i < squares.length; i++) {
      const el = squares[i];
      const isLight = el.classList.contains('light');
      el.style.background = isLight ? '#b0b0b0' : '#808080';
      el.classList.remove('wrong-tap', 'glass-highlight');
    }
  }

  function _shakeBoard() {
    const grid = _getEl('coordinateBoardGrid');
    if (!grid) return;
    grid.classList.remove('shake');
    void grid.offsetWidth;
    grid.classList.add('shake');
    setTimeout(function() { grid.classList.remove('shake'); }, 500);
  }

  /* ------------------------------------------------------------------ */
  /*  UI updates                                                        */
  /* ------------------------------------------------------------------ */

  function _updateScore() {
    const el = _getEl('coordScore');
    if (el) el.textContent = 'Score: ' + _state.score + ' / ' + _state.total;
  }

  function _updateFeedback(type) {
    const el = _getEl('coordFeedback');
    if (!el) return;
    if (type === 'correct') {
      el.textContent = _t('correct');
      el.style.color = '#34c759';
    } else if (type === 'wrong') {
      el.textContent = _t('wrong') + ' ' + (_state.target || '').toUpperCase();
      el.style.color = '#ff453a';
    } else {
      el.textContent = '';
      el.style.color = 'var(--text-secondary)';
    }
  }

  function _showCoordLabels() {
    const wrapper = _getEl('coordinateBoardWrapper');
    if (wrapper) wrapper.classList.add('show-coords');
  }

  function _hideCoordLabels() {
    const wrapper = _getEl('coordinateBoardWrapper');
    if (wrapper) wrapper.classList.remove('show-coords');
  }

  function _updateTimerDisplay() {
    const el = _getEl('coordTimer');
    if (!el) return;
    if (_state.timerSeconds <= 0) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    const m = Math.floor(_state.timeRemaining / 60);
    const s = _state.timeRemaining % 60;
    el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ------------------------------------------------------------------ */
  /*  Timer                                                             */
  /* ------------------------------------------------------------------ */

  function _startTimer() {
    _stopTimer();
    if (_state.timerSeconds <= 0) {
      _updateTimerDisplay();
      return;
    }
    _state.timeRemaining = _state.timerSeconds;
    _updateTimerDisplay();
    _state.timerInterval = setInterval(function() {
      _state.timeRemaining--;
      _updateTimerDisplay();
      if (_state.timeRemaining <= 0) {
        _stopTimer();
        _finishPractice('timeout');
      }
    }, 1000);
  }

  function _stopTimer() {
    if (_state.timerInterval) {
      clearInterval(_state.timerInterval);
      _state.timerInterval = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Question flow                                                     */
  /* ------------------------------------------------------------------ */

  function _nextQuestion() {
    _state.target = _pickTarget();
    _state.waitingCorrect = false;
    _clearHighlights();
    _hideCoordLabels();

    const promptEl = _getEl('coordPrompt');
    if (promptEl) {
      if (_state.mode === 'a') {
        promptEl.textContent = _t('findSquare') + ' ' + (_state.target || '').toUpperCase();
      } else {
        promptEl.textContent = _t('findSquare');
        _highlightSquare(_state.target, 'selected');
      }
    }

    _updateFeedback('clear');
    const input = _getEl('coordInput');
    if (input) {
      input.value = '';
      if (_state.mode === 'b' && typeof input.focus === 'function') input.focus();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Practice lifecycle                                                */
  /* ------------------------------------------------------------------ */

  function _finishPractice(reason) {
    if (!_state.active) return;
    _state.active = false;
    _stopTimer();
    _showCoordLabels();

    const duration = Math.floor((Date.now() - _state.startTime) / 1000);
    const record = {
      mode: _state.mode,
      side: _state.side,
      score: _state.score,
      total: _state.total,
      accuracy: _state.total > 0 ? _state.score / _state.total : 0,
      duration: duration
    };

    if (typeof StorageModule !== 'undefined' && StorageModule.addCoordinateRecord) {
      StorageModule.addCoordinateRecord(record);
    }

    const overlay = _getEl('coordResultOverlay');
    if (overlay) {
      const title = _getEl('coordResultTitle');
      const msg = _getEl('coordResultMsg');
      if (title) title.textContent = reason === 'timeout' ? 'Time Up!' : 'Practice Finished';
      if (msg) {
        const acc = _state.total > 0 ? Math.round(_state.score / _state.total * 100) : 0;
        msg.textContent = 'Score: ' + _state.score + ' / ' + _state.total + ' (' + acc + '% accuracy)';
      }
      overlay.classList.add('show');
    }

    const modeActions = _getEl('coordModeActions');
    if (modeActions) modeActions.style.display = 'none';
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                        */
  /* ------------------------------------------------------------------ */

  const CoordinateModule = {
    init: function() {
      // Setup buttons
      const setupActions = _getEl('coordSetupActions');
      if (setupActions) {
        const buttons = setupActions.querySelectorAll('button');
        for (let i = 0; i < buttons.length; i++) {
          const btn = buttons[i];
          const i18n = btn.getAttribute('data-i18n');
          if (i18n === 'playAsWhite') {
            btn.onclick = function() { CoordinateModule.startPractice('white', 'a'); };
          } else if (i18n === 'playAsBlack') {
            btn.onclick = function() { CoordinateModule.startPractice('black', 'a'); };
          }
        }
      }

      // Mode buttons
      const btnA = _getEl('btnModeA');
      const btnB = _getEl('btnModeB');
      if (btnA) {
        btnA.onclick = function() { CoordinateModule.startPractice(_state.side || 'white', 'a'); };
      }
      if (btnB) {
        btnB.onclick = function() { CoordinateModule.startPractice(_state.side || 'white', 'b'); };
      }

      // Input submit
      const input = _getEl('coordInput');
      if (input) {
        input.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') CoordinateModule.submitAnswer(input.value);
        });
      }
      const goBtn = _getEl('coordInputGoBtn');
      if (goBtn) {
        goBtn.onclick = function() {
          const inp = _getEl('coordInput');
          if (inp) CoordinateModule.submitAnswer(inp.value);
        };
      }

      // Result overlay buttons
      const restartBtn = _getEl('coordRestartBtn');
      if (restartBtn) {
        restartBtn.onclick = function() {
          const overlay = _getEl('coordResultOverlay');
          if (overlay) overlay.classList.remove('show');
          CoordinateModule.startPractice(_state.side, _state.mode);
        };
      }

      const backBtn = _getEl('coordBackBtn');
      if (backBtn) {
        backBtn.onclick = function() {
          const overlay = _getEl('coordResultOverlay');
          if (overlay) overlay.classList.remove('show');
          CoordinateModule.reset();
        };
      }

      // Screen back button
      const screen = _getEl('coordinateScreen');
      if (screen) {
        const back = screen.querySelector('.back-btn');
        if (back) {
          back.onclick = function() { CoordinateModule.showStartFromCoordinate(); };
        }
      }

      // Timer presets
      const presets = {
        coordTimer30: 30,
        coordTimer60: 60,
        coordTimer120: 120,
        coordTimer0: 0
      };
      for (const id in presets) {
        const btn = _getEl(id);
        if (btn) {
          btn.onclick = (function(seconds) {
            return function() { CoordinateModule.setTimer(seconds); };
          })(presets[id]);
        }
      }

      _renderBoard();
      _updateLabels();
    },

    showCoordinate: function() {
      const startScreen = _getEl('startScreen');
      const coordScreen = _getEl('coordinateScreen');
      if (startScreen) {
        startScreen.classList.remove('active');
        startScreen.classList.add('hidden');
      }
      if (coordScreen) {
        coordScreen.classList.remove('hidden');
        requestAnimationFrame(function() { coordScreen.classList.add('active'); });
      }
      CoordinateModule.reset();
    },

    showStartFromCoordinate: function() {
      CoordinateModule.reset();
      const coordScreen = _getEl('coordinateScreen');
      const startScreen = _getEl('startScreen');
      if (coordScreen) {
        coordScreen.classList.remove('active');
        coordScreen.classList.add('hidden');
      }
      if (startScreen) {
        startScreen.classList.remove('hidden');
        requestAnimationFrame(function() { startScreen.classList.add('active'); });
      }
    },

    startPractice: function(side, mode) {
      side = side || _state.side || 'white';
      mode = mode || _state.mode || 'a';

      _state.side = side;
      _state.mode = mode;
      _state.score = 0;
      _state.total = 0;
      _state.active = true;
      _state.waitingCorrect = false;
      _state.startTime = Date.now();
      _refillPool();

      const setupActions = _getEl('coordSetupActions');
      const timerPresets = _getEl('coordTimerPresets');
      const modeActions = _getEl('coordModeActions');
      const scoreEl = _getEl('coordScore');
      const promptEl = _getEl('coordPrompt');
      const inputArea = _getEl('coordInputArea');

      if (setupActions) setupActions.style.display = 'none';
      if (timerPresets) timerPresets.style.display = 'none';
      if (modeActions) modeActions.style.display = 'flex';
      if (scoreEl) scoreEl.style.display = 'block';
      if (promptEl) promptEl.style.display = 'block';
      if (inputArea) inputArea.style.display = mode === 'b' ? 'flex' : 'none';

      const btnA = _getEl('btnModeA');
      const btnB = _getEl('btnModeB');
      if (btnA) {
        btnA.style.background = mode === 'a' ? 'var(--accent)' : 'var(--surface)';
        btnA.style.color = mode === 'a' ? '#fff' : 'var(--text-primary)';
      }
      if (btnB) {
        btnB.style.background = mode === 'b' ? 'var(--accent)' : 'var(--surface)';
        btnB.style.color = mode === 'b' ? '#fff' : 'var(--text-primary)';
      }

      _renderBoard();
      _updateLabels();
      _updateScore();
      _updateFeedback('clear');
      _nextQuestion();
      _startTimer();
    },

    setTimer: function(seconds) {
      _state.timerSeconds = Math.max(0, parseInt(seconds, 10) || 0);
      _updateTimerDisplay();

      const presets = {
        coordTimer30: 30,
        coordTimer60: 60,
        coordTimer120: 120,
        coordTimer0: 0
      };
      for (const id in presets) {
        const btn = _getEl(id);
        if (btn) {
          const isSelected = _state.timerSeconds === presets[id];
          btn.style.background = isSelected ? 'var(--accent)' : 'var(--surface)';
          btn.style.color = isSelected ? '#fff' : 'var(--text-primary)';
        }
      }
    },

    submitAnswer: function(answer) {
      answer = (answer || '').toString().toLowerCase().trim();
      if (!_state.active) return;

      if (_state.waitingCorrect) {
        if (answer === _state.target) {
          _state.waitingCorrect = false;
          _clearHighlights();
          _hideCoordLabels();
          _nextQuestion();
        } else {
          _shakeBoard();
          _highlightSquare(answer, 'wrong');
          setTimeout(function() {
            const grid = _getEl('coordinateBoardGrid');
            const el = _findSquareEl(grid, answer);
            if (el) {
              const isLight = el.classList.contains('light');
              el.style.background = isLight ? '#b0b0b0' : '#808080';
              el.classList.remove('wrong-tap');
            }
          }, 400);
        }
        return;
      }

      _state.total++;
      if (answer === _state.target) {
        _state.score++;
        _updateScore();
        _highlightSquare(answer, 'correct');
        _updateFeedback('correct');
        setTimeout(function() {
          _clearHighlights();
          _nextQuestion();
        }, 600);
      } else {
        _updateScore();
        _updateFeedback('wrong');
        _state.waitingCorrect = true;
        _shakeBoard();
        _highlightSquare(_state.target, 'selected');
        _showCoordLabels();
      }
    },

    getScore: function() {
      return {
        score: _state.score,
        total: _state.total,
        accuracy: _state.total > 0 ? _state.score / _state.total : 0
      };
    },

    reset: function() {
      _stopTimer();
      _state.side = null;
      _state.mode = 'a';
      _state.score = 0;
      _state.total = 0;
      _state.target = null;
      _state.active = false;
      _state.waitingCorrect = false;
      _state.timerSeconds = 0;
      _state.timeRemaining = 0;
      _state.pool = [];

      const setupActions = _getEl('coordSetupActions');
      const timerPresets = _getEl('coordTimerPresets');
      const modeActions = _getEl('coordModeActions');
      const scoreEl = _getEl('coordScore');
      const promptEl = _getEl('coordPrompt');
      const inputArea = _getEl('coordInputArea');
      const feedback = _getEl('coordFeedback');
      const overlay = _getEl('coordResultOverlay');
      const timerEl = _getEl('coordTimer');

      if (setupActions) setupActions.style.display = 'flex';
      if (timerPresets) timerPresets.style.display = 'flex';
      if (modeActions) modeActions.style.display = 'none';
      if (scoreEl) scoreEl.style.display = 'none';
      if (promptEl) promptEl.style.display = 'none';
      if (inputArea) inputArea.style.display = 'none';
      if (feedback) {
        feedback.textContent = '';
        feedback.style.color = 'var(--text-secondary)';
      }
      if (overlay) overlay.classList.remove('show');
      if (timerEl) timerEl.style.display = 'none';

      _hideCoordLabels();
      _clearHighlights();
      _renderBoard();
      _updateLabels();
      _updateTimerDisplay();
    }
  };

  window.CoordinateModule = CoordinateModule;
})();
