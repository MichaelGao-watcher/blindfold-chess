(function() {
  'use strict';

  if (typeof window === 'undefined') global.window = global;

  // =====================================================================
  //  Internal state
  // =====================================================================
  let _moves = [];       // Array of { san, fen } after each move
  let _currentIndex = -1; // -1 = start position
  let _boardInstance = null;
  let _boardVisible = false;
  let _pgnText = '';

  // =====================================================================
  //  PGN Parser (lightweight)
  // =====================================================================
  function _parsePgn(pgn) {
    if (!pgn || typeof pgn !== 'string') return null;

    // Remove comments { ... } and variations ( ... )
    var cleaned = pgn
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ');

    // Extract move tokens: numbers like "1." or "1..." followed by SAN moves
    var tokens = cleaned.split(/\s+/).filter(function(t) { return t.length > 0; });
    var moves = [];

    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      // Skip result tokens
      if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok)) continue;
      // Handle combined tokens like "1.e4" or "12...Nf3"
      var combined = tok.match(/^\d+\.+(.+)$/);
      if (combined) {
        var movePart = combined[1];
        if (movePart && /[a-hRNBQKO]/.test(movePart)) {
          moves.push(movePart);
        }
        continue;
      }
      // Skip standalone move numbers like "1.", "1...", "12."
      if (/^\d+\.+$/.test(tok)) continue;
      // Valid SAN move contains a piece letter or file letter
      if (/[a-hRNBQKO]/.test(tok)) {
        moves.push(tok);
      }
    }

    return moves;
  }

  // =====================================================================
  //  FEN helpers (using chess.js if available)
  // =====================================================================
  function _getInitialFen() {
    return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  }

  function _applyMoves(moveList) {
    var states = [];
    var currentFen = _getInitialFen();
    states.push({ san: '*', fen: currentFen });

    if (typeof Chess !== 'function') {
      // chess.js not available: return start position only
      return states;
    }

    var game = new Chess();
    for (var i = 0; i < moveList.length; i++) {
      var move = game.move(moveList[i], { sloppy: true });
      if (!move) break;
      states.push({ san: move.san, fen: game.fen() });
    }
    return states;
  }

  function _verifySingleMove(currentFen, input) {
    if (typeof Chess !== 'function') return { valid: false, reason: 'chess.js not loaded' };
    var game = new Chess(currentFen);
    var move = game.move(input, { sloppy: true });
    if (!move) return { valid: false, reason: 'illegal move' };
    return { valid: true, san: move.san, fen: game.fen() };
  }

  // =====================================================================
  //  UI helpers
  // =====================================================================
  function _getLang() {
    if (window.SettingsModule && typeof SettingsModule.get === 'function') {
      var lang = SettingsModule.get('lang');
      if (lang === 'zh' || lang === 'en') return lang;
    }
    try { var raw = localStorage.getItem('lang'); if (raw === 'zh' || raw === 'en') return raw; }
    catch (e) {}
    return 'zh';
  }

  function _updateMoveList() {
    if (typeof document === 'undefined') return;
    var list = document.getElementById('replayMoveList');
    if (!list) return;
    list.innerHTML = '';

    for (var i = 1; i < _moves.length; i++) {
      var item = document.createElement('div');
      item.className = 'replay-move-item';
      item.style.cssText = 'padding:0.3rem 0.6rem;cursor:pointer;border-radius:6px;font-size:0.85rem;color:var(--text-primary);';
      if (i === _currentIndex) {
        item.style.background = 'var(--accent)';
        item.style.color = '#fff';
      }
      var moveNum = Math.ceil(i / 2);
      var isWhite = i % 2 === 1;
      item.textContent = (isWhite ? moveNum + '. ' : '') + _moves[i].san;
      (function(idx) {
        item.addEventListener('click', function() {
          ReplayModule.navigateToMove(idx);
        });
      })(i);
      list.appendChild(item);
    }
  }

  function _updateBoard() {
    if (typeof document === 'undefined') return;
    if (!_boardInstance) return;
    var fen = _currentIndex >= 0 && _currentIndex < _moves.length
      ? _moves[_currentIndex].fen
      : _getInitialFen();
    _boardInstance.render(fen);
  }

  function _updateInfo() {
    if (typeof document === 'undefined') return;
    var info = document.getElementById('replayInfo');
    if (!info) return;
    var total = Math.max(0, _moves.length - 1);
    var current = Math.max(0, _currentIndex);
    info.textContent = current + ' / ' + total;
  }

  // =====================================================================
  //  Public API
  // =====================================================================
  const ReplayModule = {

    init: function() {
      // Bind keyboard navigation if document exists
      if (typeof document === 'undefined') return;
      document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
          ReplayModule.navigateToMove(_currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
          ReplayModule.navigateToMove(_currentIndex + 1);
        }
      });
    },

    loadPgn: function(pgnText) {
      _pgnText = pgnText || '';
      var moveList = _parsePgn(_pgnText);
      if (!moveList) {
        _moves = [{ san: '*', fen: _getInitialFen() }];
        _currentIndex = 0;
        return false;
      }
      _moves = _applyMoves(moveList);
      _currentIndex = 0;
      _updateMoveList();
      _updateBoard();
      _updateInfo();
      return true;
    },

    verifyMove: function(input) {
      if (!input || typeof input !== 'string') return { valid: false, reason: 'empty input' };
      var currentFen = _currentIndex >= 0 && _currentIndex < _moves.length
        ? _moves[_currentIndex].fen
        : _getInitialFen();
      return _verifySingleMove(currentFen, input.trim());
    },

    loadClassicGame: function(id) {
      if (!window.ClassicGames || !Array.isArray(window.ClassicGames)) {
        return false;
      }
      var game = window.ClassicGames.find(function(g) { return g.id === id; });
      if (!game || !game.pgn) return false;
      return this.loadPgn(game.pgn);
    },

    navigateToMove: function(index) {
      var maxIndex = _moves.length - 1;
      if (index < 0) index = 0;
      if (index > maxIndex) index = maxIndex;
      _currentIndex = index;
      _updateMoveList();
      _updateBoard();
      _updateInfo();
    },

    toggleBoard: function() {
      _boardVisible = !_boardVisible;
      var container = document.getElementById('replayBoardContainer');
      if (container) {
        container.style.display = _boardVisible ? 'block' : 'none';
      }
      if (_boardVisible && !_boardInstance) {
        if (window.BoardRenderer && typeof BoardRenderer.create === 'function') {
          _boardInstance = BoardRenderer.create('replayBoardContainer', {
            showPieces: true, squareSize: 36
          });
          _updateBoard();
        }
      }
    },

    getCurrentFen: function() {
      if (_currentIndex >= 0 && _currentIndex < _moves.length) {
        return _moves[_currentIndex].fen;
      }
      return _getInitialFen();
    },

    // Internal helpers for testing
    _parsePgn: _parsePgn,
    _getMoves: function() { return _moves; },
    _getCurrentIndex: function() { return _currentIndex; }
  };

  window.ReplayModule = ReplayModule;
})();
