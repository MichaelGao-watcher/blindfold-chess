(function() {
  'use strict';

  /* ================================================================
     BlindfoldModule — 盲棋对战核心模块
     职责：与 Stockfish 对弈、走子输入、终局判定、PGN、自动保存
     ================================================================= */

  // ---- 内部状态 ----
  let _game = null;
  let _boardRenderer = null;
  let _boardVisible = false;
  let _currentLevel = 'medium';
  let _gameStartTime = 0;
  let _gameOverCallbacks = [];
  let _audioCtx = null;
  let _eventsBound = false;
  let _isGameOver = false;

  // ---- DOM 快捷访问 ----
  function _el(id) {
    return document.getElementById(id);
  }

  // ---- 国际化兜底（common.js 的 t() 可能不可用） ----
  function _t(key) {
    if (typeof t === 'function') return t(key);
    const dict = {
      engineReady: 'Ready', engineThinking: 'Thinking...',
      newGameStarted: 'New game started. White to move.',
      resultCheckmate: 'Checkmate', resultStalemate: 'Stalemate',
      resultDraw: 'Draw', resultOver: 'Game Over',
      whiteWins: 'White wins by checkmate!',
      blackWins: 'Black wins by checkmate!',
      stalemateDraw: 'Game drawn by stalemate.',
      gameDrawn: 'Game drawn.', gameEnded: 'The game has ended.',
      resigned: 'Resigned', resignedMsg: 'You resigned. Stockfish wins.',
      loadingError: 'Failed to load Stockfish. Try refreshing or check console.'
    };
    return dict[key] || key;
  }

  // ---- 音效 ----
  function _playMoveSound() {
    try {
      if (!_audioCtx) {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (_audioCtx.state === 'suspended') _audioCtx.resume();
      const osc = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, _audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, _audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, _audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.12);
      osc.start(_audioCtx.currentTime);
      osc.stop(_audioCtx.currentTime + 0.12);
    } catch (e) {
      // Audio unavailable, ignore silently
    }
  }

  // ---- 走法规范化 ----
  function _normalizeMove(input) {
    const s = (input || '').trim();
    if (/^0-0-0$/i.test(s) || /^o-o-o$/i.test(s)) return 'O-O-O';
    if (/^0-0$/i.test(s) || /^o-o$/i.test(s)) return 'O-O';
    return s.replace(/[a-h]/gi, m => m.toLowerCase())
            .replace(/[nbrqk]/gi, m => m.toUpperCase());
  }

  // ---- 引擎状态文字 ----
  function _updateEngineStatus(text) {
    const el = _el('engineStatus');
    if (!el) return;
    const isThinking = text === _t('engineThinking');
    const dot = isThinking ? '◐' : '●';
    el.textContent = dot + ' ' + text;
    el.classList.toggle('thinking', isThinking);
    el.classList.toggle('error', text === _t('loadingError'));
  }

  // ---- 走法历史 ----
  function _updateMoveHistory() {
    const container = _el('moveHistory');
    if (!container || !_game) return;
    const history = _game.history();
    if (history.length === 0) {
      container.innerHTML = '<div style="color:var(--text-secondary);text-align:center;font-size:0.9rem;padding:1rem 0;">' + _t('newGameStarted') + '</div>';
      return;
    }
    let html = '';
    for (let i = 0; i < history.length; i += 2) {
      const num = Math.floor(i / 2) + 1;
      const white = history[i];
      const black = history[i + 1] || '';
      html += '<div class="move-row"><span class="move-number">' + num + '.</span><span class="move-white">' + white + '</span><span class="move-black">' + black + '</span></div>';
    }
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  // ---- 棋盘渲染 ----
  function _renderBoard() {
    if (_boardRenderer && _boardVisible && _game) {
      _boardRenderer.render(_game.fen());
    }
  }

  // ---- PGN 生成 ----
  function _generatePgnHeader(result) {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    const moves = _game ? (_game.pgn() || '') : '';
    return '[Event "Blindfold Chess"]\n' +
           '[Site "https://michaelgao-watcher.github.io/blindfold-chess/"]\n' +
           '[Date "' + today + '"]' + '\n' +
           '[White "Player"]\n' +
           '[Black "Stockfish"]\n' +
           '[Result "' + result + '"]' + '\n\n' +
           moves;
  }

  function _setResultPgn(result) {
    const pgnEl = _el('resultPgn');
    if (pgnEl) pgnEl.textContent = _generatePgnHeader(result);
  }

  // ---- 复制 PGN ----
  function _copyPgn() {
    const pgnEl = _el('resultPgn');
    if (!pgnEl || !pgnEl.textContent) return;
    const text = pgnEl.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        const btn = document.querySelector('.copy-btn');
        if (btn) {
          const orig = btn.textContent;
          btn.textContent = '✓ 已复制';
          setTimeout(function() { btn.textContent = orig; }, 1500);
        }
      }).catch(function() { _fallbackCopy(text); });
    } else {
      _fallbackCopy(text);
    }
  }

  function _fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      const btn = document.querySelector('.copy-btn');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✓ 已复制';
        setTimeout(function() { btn.textContent = orig; }, 1500);
      }
    } catch (e) {}
    document.body.removeChild(ta);
  }

  // ---- 结果遮罩 ----
  function _showResultOverlay(title, msg, result) {
    const titleEl = _el('resultTitle');
    const msgEl = _el('resultMsg');
    const overlay = _el('resultOverlay');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = msg;
    _setResultPgn(result);
    if (overlay) overlay.classList.add('show');
  }

  function _hideResultOverlay() {
    const overlay = _el('resultOverlay');
    if (overlay) overlay.classList.remove('show');
  }

  // ---- 终局处理 ----
  function _handleGameOver() {
    if (!_game || _isGameOver) return;
    _isGameOver = true;
    const input = _el('moveInput');
    if (input) input.disabled = true;

    let title, msg, result;
    if (_game.in_checkmate()) {
      const winner = _game.turn() === 'w' ? 'Black' : 'White';
      title = _t('resultCheckmate');
      msg = winner === 'White' ? _t('whiteWins') : _t('blackWins');
      result = winner === 'White' ? '1-0' : '0-1';
    } else if (_game.in_stalemate()) {
      title = _t('resultStalemate');
      msg = _t('stalemateDraw');
      result = '1/2-1/2';
    } else if (_game.in_draw()) {
      title = _t('resultDraw');
      msg = _t('gameDrawn');
      result = '1/2-1/2';
    } else {
      title = _t('resultOver');
      msg = _t('gameEnded');
      result = '*';
    }

    _showResultOverlay(title, msg, result);
    _autoSave(result);

    const gameResult = {
      result: result,
      pgn: _generatePgnHeader(result),
      moves: _game.history().length,
      duration: Math.floor((Date.now() - _gameStartTime) / 1000),
      difficulty: _currentLevel
    };
    _gameOverCallbacks.forEach(function(cb) {
      try { cb(gameResult); } catch (e) { console.error('onGameOver callback error:', e); }
    });
  }

  // ---- 自动保存 ----
  function _autoSave(result) {
    if (typeof StorageModule === 'undefined' || !StorageModule.addGameRecord) return;
    const duration = Math.floor((Date.now() - _gameStartTime) / 1000);
    const record = {
      difficulty: _currentLevel,
      result: result,
      pgn: _generatePgnHeader(result),
      moves: _game.history().length,
      duration: duration
    };
    StorageModule.addGameRecord(record).catch(function(err) {
      console.warn('Auto-save failed:', err);
    });
  }

  // ---- 引擎走法回调 ----
  function _handleEngineMove(bestMoveUci) {
    const input = _el('moveInput');
    if (!bestMoveUci) {
      if (input) { input.disabled = true; }
      _updateEngineStatus(_t('engineReady'));
      return;
    }

    if (!_game) return;
    const moves = _game.moves({ verbose: true });
    const match = moves.find(function(m) {
      let uci = m.from + m.to;
      if (m.promotion) uci += m.promotion;
      return uci === bestMoveUci;
    });

    if (match) {
      const result = _game.move(match.san);
      if (result) {
        _updateMoveHistory();
        _renderBoard();
        _playMoveSound();
      } else {
        console.error('Engine move failed:', match.san);
      }
    } else {
      console.error('Engine UCI not matched:', bestMoveUci, 'legal moves:', moves.map(function(m) { return m.from + m.to + (m.promotion || ''); }));
    }

    if (input) {
      input.disabled = false;
      input.focus();
    }
    _updateEngineStatus(_t('engineReady'));

    if (_game.game_over()) {
      _handleGameOver();
    }
  }

  // ---- 事件绑定（只执行一次） ----
  function _bindEvents() {
    if (_eventsBound) return;
    _eventsBound = true;

    // 提交按钮
    const moveInput = _el('moveInput');
    const submitBtn = moveInput && moveInput.parentElement ? moveInput.parentElement.querySelector('button') : null;
    if (submitBtn) {
      submitBtn.addEventListener('click', function() {
        BlindfoldModule.submitMove(moveInput.value);
      });
    }

    // 棋盘切换
    const boardToggle = document.querySelector('.board-toggle');
    if (boardToggle) {
      boardToggle.addEventListener('click', function() {
        BlindfoldModule.toggleBoard();
      });
    }

    // 新局
    const newGameBtn = _el('gameScreen') ? _el('gameScreen').querySelector('.game-actions button[data-i18n="newGame"]') : null;
    if (newGameBtn) {
      newGameBtn.addEventListener('click', function() {
        BlindfoldModule.newGame();
      });
    }

    // 认输
    const resignBtn = _el('gameScreen') ? _el('gameScreen').querySelector('.game-actions button[data-i18n="resign"]') : null;
    if (resignBtn) {
      resignBtn.addEventListener('click', function() {
        BlindfoldModule.resign();
      });
    }

    // 返回主菜单
    const backBtn = _el('gameScreen') ? _el('gameScreen').querySelector('.back-btn') : null;
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        if (typeof EngineModule !== 'undefined' && EngineModule.terminate) {
          EngineModule.terminate();
        }
        const gs = _el('gameScreen');
        if (gs) { gs.classList.remove('active'); gs.classList.add('hidden'); }
        const start = _el('startScreen');
        if (start) { start.classList.remove('hidden'); requestAnimationFrame(function() { start.classList.add('active'); }); }
      });
    }

    // 复制 PGN
    const copyBtn = document.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', _copyPgn);
    }

    // 再来一局（结果遮罩内）
    const playAgainBtn = _el('resultOverlay') ? _el('resultOverlay').querySelector('button[data-i18n="playAgain"]') : null;
    if (playAgainBtn) {
      playAgainBtn.addEventListener('click', function() {
        _hideResultOverlay();
        BlindfoldModule.newGame();
      });
    }
  }

  // ---- 公共 API ----
  const BlindfoldModule = {

    /**
     * 初始化新对局
     * @param {string} level - 'easy'|'medium'|'hard'|'expert'
     */
    init: function(level) {
      _currentLevel = level || 'medium';
      _isGameOver = false;
      _gameStartTime = Date.now();

      // 更新难度徽标
      const diffBadge = _el('diffBadge');
      if (diffBadge) diffBadge.textContent = _t(_currentLevel);

      // 切换屏幕到游戏界面
      const diffScreen = _el('difficultyScreen');
      if (diffScreen) { diffScreen.classList.remove('active'); diffScreen.classList.add('hidden'); }
      const gs = _el('gameScreen');
      if (gs) { gs.classList.remove('hidden'); requestAnimationFrame(function() { gs.classList.add('active'); }); }

      // 初始化棋盘逻辑
      _game = new Chess();
      _boardVisible = false;
      const boardPanel = _el('boardPanel');
      if (boardPanel) boardPanel.classList.add('hidden');

      // 清空输入
      const input = _el('moveInput');
      if (input) { input.value = ''; input.disabled = false; input.style.borderColor = ''; }

      // 清空历史
      _updateMoveHistory();

      // 引擎状态
      _updateEngineStatus(_t('engineReady'));

      // 隐藏结果遮罩
      _hideResultOverlay();

      // 绑定事件（首次）
      _bindEvents();

      // 初始化/重置棋盘渲染器
      if (typeof BoardRenderer !== 'undefined') {
        if (_boardRenderer) _boardRenderer.destroy();
        _boardRenderer = BoardRenderer.create('boardGrid', { showPieces: true });
      }

      // 初始化引擎
      if (typeof EngineModule !== 'undefined') {
        EngineModule.terminate();
        EngineModule.init().then(function() {
          EngineModule.setDifficulty(_currentLevel);
          _updateEngineStatus(_t('engineReady'));
        }).catch(function(err) {
          console.error('Engine init failed:', err);
          _updateEngineStatus(_t('loadingError'));
          const moveHistory = _el('moveHistory');
          if (moveHistory) {
            moveHistory.innerHTML = '<div style="color:#ff453a;text-align:center;padding:1rem;">' + _t('loadingError') + '</div>';
          }
        });
      }
    },

    /**
     * 提交用户走法
     * @param {string} input - 代数记谱法字符串
     */
    submitMove: function(input) {
      if (!_game || _game.game_over() || _isGameOver) return;
      const moveInput = _el('moveInput');
      const san = _normalizeMove(input || (moveInput ? moveInput.value : ''));
      if (!san) return;

      const move = _game.move(san);
      if (!move) {
        // 非法走法：红色边框 + 震动
        if (moveInput) {
          moveInput.style.borderColor = '#ff453a';
          moveInput.style.transform = 'translateX(-4px)';
          setTimeout(function() { moveInput.style.transform = 'translateX(4px)'; }, 60);
          setTimeout(function() { moveInput.style.transform = 'translateX(-4px)'; }, 120);
          setTimeout(function() { moveInput.style.transform = 'translateX(4px)'; }, 180);
          setTimeout(function() { moveInput.style.transform = 'translateX(0)'; moveInput.style.borderColor = ''; }, 240);
        }
        return;
      }

      // 合法走法
      if (moveInput) { moveInput.value = ''; moveInput.style.borderColor = ''; }
      _updateMoveHistory();
      _renderBoard();
      _playMoveSound();

      if (_game.game_over()) {
        _handleGameOver();
        return;
      }

      // 触发引擎思考
      if (typeof EngineModule === 'undefined' || !EngineModule.isReady || !EngineModule.isReady()) {
        _updateEngineStatus(_t('loadingError'));
        return;
      }

      if (moveInput) moveInput.disabled = true;
      _updateEngineStatus(_t('engineThinking'));
      EngineModule.setPosition(_game.fen());
      EngineModule.go(_handleEngineMove);
    },

    /**
     * 显示/隐藏棋盘
     */
    toggleBoard: function() {
      _boardVisible = !_boardVisible;
      const boardPanel = _el('boardPanel');
      if (boardPanel) boardPanel.classList.toggle('hidden', !_boardVisible);
      if (_boardVisible) _renderBoard();
    },

    /**
     * 认输
     */
    resign: function() {
      if (!_game || _game.game_over() || _isGameOver) return;
      _isGameOver = true;
      const input = _el('moveInput');
      if (input) input.disabled = true;
      _showResultOverlay(_t('resigned'), _t('resignedMsg'), '0-1');
      _autoSave('0-1');

      const gameResult = {
        result: '0-1',
        pgn: _generatePgnHeader('0-1'),
        moves: _game.history().length,
        duration: Math.floor((Date.now() - _gameStartTime) / 1000),
        difficulty: _currentLevel
      };
      _gameOverCallbacks.forEach(function(cb) {
        try { cb(gameResult); } catch (e) { console.error('onGameOver callback error:', e); }
      });
    },

    /**
     * 重新开始（显示结果遮罩后调用）
     */
    newGame: function() {
      _hideResultOverlay();
      BlindfoldModule.init(_currentLevel);
    },

    /**
     * 返回当前对局 PGN 字符串
     * @returns {string}
     */
    getPgn: function() {
      if (!_game) return '';
      let result = '*';
      if (_game.in_checkmate()) result = _game.turn() === 'w' ? '0-1' : '1-0';
      else if (_game.in_stalemate() || _game.in_draw()) result = '1/2-1/2';
      return _generatePgnHeader(result);
    },

    /**
     * 返回当前局面 FEN
     * @returns {string}
     */
    getCurrentFen: function() {
      return _game ? _game.fen() : '';
    },

    /**
     * 注册终局回调
     * @param {Function} callback - 接收 { result, pgn, moves, duration, difficulty }
     */
    onGameOver: function(callback) {
      if (typeof callback === 'function') _gameOverCallbacks.push(callback);
    }
  };

  window.BlindfoldModule = BlindfoldModule;
})();
