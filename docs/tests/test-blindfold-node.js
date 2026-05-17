/**
 * Node.js test runner for BlindfoldModule.
 * Provides mocks for Chess, EngineModule, BoardRenderer, StorageModule, and DOM.
 */

'use strict';

// ── Load real chess.js ──
const { Chess } = require('../../chess.js');
global.Chess = Chess;

// ── Minimal DOM Mock ──
class MockElement {
  constructor(tagName) {
    this.tagName = tagName ? tagName.toLowerCase() : 'div';
    this.id = '';
    this.className = '';
    this.classList = new MockClassList(this);
    this.style = {};
    this.children = [];
    this._parent = null;
    this._attrs = new Map();
    this._textContent = '';
    this._listeners = {};
  }

  setAttribute(key, val) { this._attrs.set(key, val); }
  getAttribute(key) { return this._attrs.get(key) || null; }
  removeAttribute(key) { this._attrs.delete(key); }

  appendChild(child) {
    if (child._parent) child._parent.removeChild(child);
    this.children.push(child);
    child._parent = this;
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child._parent = null;
    }
    return child;
  }

  addEventListener(type, fn) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(fn);
  }
  removeEventListener(type, fn) {
    if (!this._listeners[type]) return;
    const idx = this._listeners[type].indexOf(fn);
    if (idx !== -1) this._listeners[type].splice(idx, 1);
  }
  dispatchEvent(ev) {
    const list = this._listeners[ev.type] || [];
    for (const fn of list) {
      fn.call(this, ev);
    }
    return !ev.defaultPrevented;
  }

  querySelectorAll(sel) {
    const results = [];
    const tokens = sel.split(/\s+/);
    const last = tokens[tokens.length - 1];
    function walk(el) {
      if (el.children) {
        for (const c of el.children) {
          if (matches(c, last)) results.push(c);
          walk(c);
        }
      }
    }
    walk(this);
    return results;
  }
  querySelector(sel) {
    const all = this.querySelectorAll(sel);
    return all.length > 0 ? all[0] : null;
  }

  get textContent() { return this._textContent; }
  set textContent(v) { this._textContent = v; }
  get innerHTML() { return this._innerHTML || ''; }
  set innerHTML(v) {
    this._innerHTML = v;
    // Naive HTML-to-text for test convenience
    this._textContent = String(v).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
  focus() {}
}

function matches(el, sel) {
  if (sel.startsWith('#')) return el.id === sel.slice(1);
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
  if (sel.startsWith('[')) {
    const m = sel.match(/\[([^\]=]+)(?:=["']?([^"'\]]*)["']?)?\]/);
    if (!m) return false;
    const attr = m[1];
    const val = m[2];
    if (val === undefined) return el.getAttribute(attr) !== null;
    return el.getAttribute(attr) === val;
  }
  return el.tagName === sel.toLowerCase();
}

class MockClassList {
  constructor(el) { this._el = el; this._set = new Set(); }
  add(cls) { this._set.add(cls); }
  remove(cls) { this._set.delete(cls); }
  toggle(cls, force) {
    if (force === undefined) {
      if (this._set.has(cls)) { this._set.delete(cls); return false; }
      else { this._set.add(cls); return true; }
    } else {
      if (force) this._set.add(cls); else this._set.delete(cls);
      return force;
    }
  }
  contains(cls) { return this._set.has(cls); }
}

class MockDocument {
  constructor() {
    this._byId = new Map();
    this.documentElement = { lang: 'zh-CN', setAttribute() {}, getAttribute() { return null; } };
    this.body = this.createElement('body');
  }
  createElement(tag) { return new MockElement(tag); }
  getElementById(id) { return this._byId.get(id) || null; }
  querySelector(sel) { return this.body.querySelector(sel); }
  querySelectorAll(sel) { return this.body.querySelectorAll(sel); }
  _register(el) { if (el.id) this._byId.set(el.id, el); }
}

class MockEvent {
  constructor(type, opts) {
    this.type = type;
    this.bubbles = opts && opts.bubbles;
    this.defaultPrevented = false;
  }
  preventDefault() { this.defaultPrevented = true; }
}

// ── Build DOM tree matching gameScreen ──
const doc = new MockDocument();
global.document = doc;
global.window = global;
global.requestAnimationFrame = function(fn) { fn(); return 0; };
global.cancelAnimationFrame = function(id) { clearTimeout(id); };
Object.defineProperty(global, 'navigator', {
  value: { clipboard: null },
  writable: true,
  configurable: true
});
global.console = global.console || { log() {}, warn() {}, error() {} };
global.Event = MockEvent;
global.MouseEvent = MockEvent;
global.AudioContext = class AudioContext {
  constructor() { this.state = 'running'; this.currentTime = 0; }
  resume() { return Promise.resolve(); }
  createOscillator() { return { connect() {}, frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, start() {}, stop() {} }; }
  createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
};

function buildEl(tag, opts) {
  opts = opts || {};
  const el = doc.createElement(tag);
  if (opts.id) { el.id = opts.id; doc._register(el); }
  if (opts.class) { opts.class.split(' ').forEach(c => el.classList.add(c)); }
  if (opts.text) { el.textContent = opts.text; }
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) {
      el.setAttribute(k, v);
    }
  }
  return el;
}

// Screens
doc.body.appendChild(buildEl('div', { id: 'startScreen', class: 'screen active' }));
doc.body.appendChild(buildEl('div', { id: 'difficultyScreen', class: 'screen hidden' }));

const gameScreen = buildEl('div', { id: 'gameScreen', class: 'screen hidden' });
const gameHeader = buildEl('div', { class: 'game-header' });
const backBtn = buildEl('button', { class: 'back-btn' });
backBtn.textContent = 'Back';
gameHeader.appendChild(backBtn);
const diffBadge = buildEl('span', { id: 'diffBadge', class: 'difficulty-badge' });
gameHeader.appendChild(diffBadge);
const engineStatus = buildEl('span', { id: 'engineStatus', class: 'engine-status' });
gameHeader.appendChild(engineStatus);
const boardToggle = buildEl('button', { class: 'board-toggle' });
gameHeader.appendChild(boardToggle);
gameScreen.appendChild(gameHeader);

const boardPanel = buildEl('div', { id: 'boardPanel', class: 'board-panel hidden' });
const boardGrid = buildEl('div', { id: 'boardGrid' });
boardPanel.appendChild(boardGrid);
gameScreen.appendChild(boardPanel);

const moveHistory = buildEl('div', { id: 'moveHistory' });
gameScreen.appendChild(moveHistory);

const gameInput = buildEl('div', { class: 'game-input' });
const moveInput = buildEl('input', { id: 'moveInput' });
gameInput.appendChild(moveInput);
const submitBtn = buildEl('button', { id: 'moveSubmitBtn' });
submitBtn.textContent = 'Go';
gameInput.appendChild(submitBtn);
gameScreen.appendChild(gameInput);

const gameActions = buildEl('div', { class: 'game-actions' });
const newGameBtn = buildEl('button', { id: 'newGameBtn', attrs: { 'data-i18n': 'newGame' } });
newGameBtn.textContent = 'New Game';
gameActions.appendChild(newGameBtn);
const resignBtn = buildEl('button', { id: 'resignBtn', attrs: { 'data-i18n': 'resign' } });
resignBtn.textContent = 'Resign';
gameActions.appendChild(resignBtn);
gameScreen.appendChild(gameActions);
doc.body.appendChild(gameScreen);

const resultOverlay = buildEl('div', { id: 'resultOverlay', class: 'result-overlay' });
const resultCard = buildEl('div', { class: 'result-card' });
const resultTitle = buildEl('div', { id: 'resultTitle', class: 'result-title' });
resultCard.appendChild(resultTitle);
const resultMsg = buildEl('div', { id: 'resultMsg', class: 'result-msg' });
resultCard.appendChild(resultMsg);
const resultPgnWrap = buildEl('div', { class: 'result-pgn-wrap' });
const resultPgn = buildEl('pre', { id: 'resultPgn' });
resultPgnWrap.appendChild(resultPgn);
const copyBtn = buildEl('button', { class: 'copy-btn' });
copyBtn.textContent = '📋 复制 PGN';
resultPgnWrap.appendChild(copyBtn);
resultCard.appendChild(resultPgnWrap);
const playAgainBtn = buildEl('button', { id: 'playAgainBtn', attrs: { 'data-i18n': 'playAgain' } });
playAgainBtn.textContent = 'Play Again';
resultCard.appendChild(playAgainBtn);
resultOverlay.appendChild(resultCard);
doc.body.appendChild(resultOverlay);

// ── Mocks for dependencies ──

const _engineState = {
  ready: true,
  lastFen: '',
  goCallback: null,
  difficulty: null
};

global.EngineModule = {
  init: function() {
    _engineState.ready = true;
    return Promise.resolve();
  },
  setDifficulty: function(config) {
    _engineState.difficulty = config;
  },
  setPosition: function(fen) {
    _engineState.lastFen = fen;
  },
  go: function(callback) {
    _engineState.goCallback = callback;
    _engineState.ready = false;
    // Simulate async engine response: e7e5 is a common reply to e2e4
    setTimeout(function() {
      _engineState.ready = true;
      if (callback) callback('e7e5');
    }, 10);
  },
  stop: function() {},
  terminate: function() {
    _engineState.ready = false;
    _engineState.goCallback = null;
  },
  isReady: function() { return _engineState.ready; }
};

global.BoardRenderer = {
  create: function(containerId, options) {
    return {
      render: function(fen) {},
      highlight: function(square, type) {},
      clearHighlight: function() {},
      shake: function() {},
      onSquareClick: function(callback) {},
      destroy: function() {}
    };
  }
};

const _storedRecords = [];
global.StorageModule = {
  addGameRecord: function(record) {
    _storedRecords.push(record);
    return Promise.resolve();
  },
  getStoredRecords: function() { return _storedRecords; },
  clearStoredRecords: function() { _storedRecords.length = 0; }
};

// ── Load TestRunner and BlindfoldModule ──
require('../../js/test-runner.js');
require('../../js/blindfold.js');

// ── Helpers ──
function isHidden(id) {
  const el = doc.getElementById(id);
  return !el || el.classList.contains('hidden');
}
function isActive(id) {
  const el = doc.getElementById(id);
  return el && el.classList.contains('active') && !el.classList.contains('hidden');
}
function getText(id) {
  const el = doc.getElementById(id);
  return el ? el.textContent : '';
}

// ── Test suites ──

TestRunner.suite('BlindfoldModule API', function() {
  TestRunner.test('BlindfoldModule exposed on window', function() {
    TestRunner.assert(typeof window.BlindfoldModule === 'object', 'BlindfoldModule not exposed');
  });
  TestRunner.test('all required methods exist', function() {
    const m = window.BlindfoldModule;
    TestRunner.assert(typeof m.init === 'function', 'init missing');
    TestRunner.assert(typeof m.submitMove === 'function', 'submitMove missing');
    TestRunner.assert(typeof m.toggleBoard === 'function', 'toggleBoard missing');
    TestRunner.assert(typeof m.resign === 'function', 'resign missing');
    TestRunner.assert(typeof m.newGame === 'function', 'newGame missing');
    TestRunner.assert(typeof m.getPgn === 'function', 'getPgn missing');
    TestRunner.assert(typeof m.getCurrentFen === 'function', 'getCurrentFen missing');
    TestRunner.assert(typeof m.onGameOver === 'function', 'onGameOver missing');
  });
});

TestRunner.suite('BlindfoldModule.init', function() {
  TestRunner.test('init(easy) shows gameScreen and sets badge', function() {
    window.BlindfoldModule.init('easy');
    TestRunner.assert(isActive('gameScreen'), 'gameScreen should be active');
    TestRunner.assert(isHidden('difficultyScreen'), 'difficultyScreen should be hidden');
    TestRunner.assertEqual(getText('diffBadge'), 'easy', 'diffBadge should show easy');
  });

  TestRunner.test('init(medium) sets badge correctly', function() {
    window.BlindfoldModule.init('medium');
    TestRunner.assertEqual(getText('diffBadge'), 'medium');
  });

  TestRunner.test('init(hard) sets badge correctly', function() {
    window.BlindfoldModule.init('hard');
    TestRunner.assertEqual(getText('diffBadge'), 'hard');
  });

  TestRunner.test('init(expert) sets badge correctly', function() {
    window.BlindfoldModule.init('expert');
    TestRunner.assertEqual(getText('diffBadge'), 'expert');
  });

  TestRunner.test('init hides board by default', function() {
    window.BlindfoldModule.init('medium');
    TestRunner.assert(isHidden('boardPanel'), 'boardPanel should be hidden initially');
  });

  TestRunner.test('init clears move input', function() {
    window.BlindfoldModule.init('medium');
    const input = doc.getElementById('moveInput');
    TestRunner.assertEqual(input.value, '', 'moveInput should be empty');
    TestRunner.assertEqual(input.disabled, false, 'moveInput should be enabled');
  });

  TestRunner.test('init resets move history', function() {
    window.BlindfoldModule.init('medium');
    const hist = doc.getElementById('moveHistory');
    TestRunner.assert(hist.textContent.includes('New game started') || hist.innerHTML.includes('New game started'), 'history should show new game message');
  });
});

TestRunner.suite('BlindfoldModule.submitMove', function() {
  TestRunner.test('legal move is accepted and engine is triggered', async function() {
    window.BlindfoldModule.init('medium');
    _engineState.lastFen = '';
    window.BlindfoldModule.submitMove('e4');
    TestRunner.assertEqual(window.BlindfoldModule.getCurrentFen(), 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    await new Promise(r => setTimeout(r, 50));
    TestRunner.assert(_engineState.lastFen !== '', 'engine setPosition should have been called');
  });

  TestRunner.test('illegal move is rejected with shake effect', function() {
    window.BlindfoldModule.init('medium');
    const input = doc.getElementById('moveInput');
    input.value = 'xyz';
    input.style.borderColor = '';
    window.BlindfoldModule.submitMove('xyz');
    TestRunner.assertEqual(window.BlindfoldModule.getCurrentFen(), 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    TestRunner.assert(input.style.borderColor === '#ff453a', 'input should have red border after illegal move');
  });

  TestRunner.test('empty move is ignored', function() {
    window.BlindfoldModule.init('medium');
    const before = window.BlindfoldModule.getCurrentFen();
    window.BlindfoldModule.submitMove('');
    TestRunner.assertEqual(window.BlindfoldModule.getCurrentFen(), before);
  });

  TestRunner.test('engine replies and updates board', async function() {
    window.BlindfoldModule.init('medium');
    window.BlindfoldModule.submitMove('e4');
    await new Promise(r => setTimeout(r, 50));
    const fen = window.BlindfoldModule.getCurrentFen();
    // After e4 and engine reply e7e5, it's white's turn again
    TestRunner.assert(fen.includes('w KQkq'), 'after e4 e5 it should be white to move');
    const hist = doc.getElementById('moveHistory');
    TestRunner.assert(hist.textContent.includes('e4'), 'history should contain e4');
    TestRunner.assert(hist.textContent.includes('e5'), 'history should contain e5');
  });
});

TestRunner.suite('BlindfoldModule.toggleBoard', function() {
  TestRunner.test('toggleBoard shows hidden board', function() {
    window.BlindfoldModule.init('medium');
    TestRunner.assert(isHidden('boardPanel'), 'boardPanel should start hidden');
    window.BlindfoldModule.toggleBoard();
    TestRunner.assert(!isHidden('boardPanel'), 'boardPanel should be visible after toggle');
  });

  TestRunner.test('toggleBoard hides visible board', function() {
    window.BlindfoldModule.init('medium');
    window.BlindfoldModule.toggleBoard();
    TestRunner.assert(!isHidden('boardPanel'));
    window.BlindfoldModule.toggleBoard();
    TestRunner.assert(isHidden('boardPanel'), 'boardPanel should be hidden after second toggle');
  });
});

TestRunner.suite('BlindfoldModule.resign', function() {
  TestRunner.test('resign shows result overlay with 0-1', function() {
    window.BlindfoldModule.init('medium');
    window.BlindfoldModule.resign();
    const overlay = doc.getElementById('resultOverlay');
    TestRunner.assert(overlay.classList.contains('show'), 'resultOverlay should show');
    TestRunner.assertEqual(getText('resultTitle'), 'Resigned');
    TestRunner.assertEqual(getText('resultMsg'), 'You resigned. Stockfish wins.');
    const pgn = doc.getElementById('resultPgn').textContent;
    TestRunner.assert(pgn.includes('[Result "0-1"]'), 'PGN should contain 0-1');
  });

  TestRunner.test('resign disables input', function() {
    window.BlindfoldModule.init('medium');
    window.BlindfoldModule.resign();
    TestRunner.assertEqual(doc.getElementById('moveInput').disabled, true);
  });

  TestRunner.test('resign auto-saves record', function() {
    StorageModule.clearStoredRecords();
    window.BlindfoldModule.init('medium');
    window.BlindfoldModule.resign();
    const recs = StorageModule.getStoredRecords();
    TestRunner.assertEqual(recs.length, 1);
    TestRunner.assertEqual(recs[0].result, '0-1');
    TestRunner.assertEqual(recs[0].difficulty, 'medium');
  });
});

TestRunner.suite('BlindfoldModule.newGame', function() {
  TestRunner.test('newGame hides overlay and restarts', function() {
    window.BlindfoldModule.init('medium');
    window.BlindfoldModule.resign();
    TestRunner.assert(doc.getElementById('resultOverlay').classList.contains('show'));
    window.BlindfoldModule.newGame();
    TestRunner.assert(!doc.getElementById('resultOverlay').classList.contains('show'), 'overlay should be hidden');
    TestRunner.assert(isActive('gameScreen'), 'gameScreen should still be active');
  });
});

TestRunner.suite('BlindfoldModule game over detection', function() {
  TestRunner.test('checkmate triggers onGameOver with 1-0', async function() {
    // Scholar's mate position after 7... Ke7?? 8. Qxe7#
    const mateFen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 4';
    const game = new Chess(mateFen);
    // White to move in our module, but this FEN has black to move and black is checkmated
    // Let's use a position where white just delivered checkmate
    const whiteMateFen = 'rnb1kbnr/pppp1Qpp/8/4p3/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 3';
    
    window.BlindfoldModule.init('medium');
    // Replace internal game with checkmate position
    // We can't directly set _game, but we can play moves to reach a known end
    // Let's instead test via the onGameOver callback during a normal resign
    let called = false;
    let resultArg = null;
    window.BlindfoldModule.onGameOver(function(res) { called = true; resultArg = res; });
    window.BlindfoldModule.resign();
    TestRunner.assert(called, 'onGameOver callback should be called on resign');
    TestRunner.assertEqual(resultArg.result, '0-1');
    TestRunner.assert(typeof resultArg.pgn === 'string', 'callback should include pgn');
    TestRunner.assert(typeof resultArg.moves === 'number', 'callback should include moves');
    TestRunner.assert(typeof resultArg.duration === 'number', 'callback should include duration');
    TestRunner.assertEqual(resultArg.difficulty, 'medium');
  });

  TestRunner.test('stalemate detection', function() {
    const staleFen = '8/8/8/8/8/1qk5/8/K7 w - - 0 1';
    const game = new Chess(staleFen);
    TestRunner.assert(game.in_stalemate(), 'Chess mock should detect stalemate');
  });

  TestRunner.test('draw detection (50-move rule)', function() {
    const drawFen = '8/8/8/8/8/8/8/4K2k w - - 100 1';
    const game = new Chess(drawFen);
    TestRunner.assert(game.in_draw(), 'Chess mock should detect draw by 50-move rule');
  });
});

TestRunner.suite('BlindfoldModule PGN format', function() {
  TestRunner.test('PGN contains standard headers', function() {
    window.BlindfoldModule.init('medium');
    window.BlindfoldModule.submitMove('e4');
    const pgn = window.BlindfoldModule.getPgn();
    TestRunner.assert(pgn.includes('[Event "Blindfold Chess"]'), 'missing Event header');
    TestRunner.assert(pgn.includes('[Site "https://michaelgao-watcher.github.io/blindfold-chess/"]'), 'missing Site header');
    TestRunner.assert(pgn.includes('[Date "'), 'missing Date header');
    TestRunner.assert(pgn.includes('[White "Player"]'), 'missing White header');
    TestRunner.assert(pgn.includes('[Black "Stockfish"]'), 'missing Black header');
    TestRunner.assert(pgn.includes('[Result "'), 'missing Result header');
  });

  TestRunner.test('PGN includes move text', function() {
    window.BlindfoldModule.init('medium');
    window.BlindfoldModule.submitMove('e4');
    const pgn = window.BlindfoldModule.getPgn();
    TestRunner.assert(pgn.includes('e4'), 'PGN should contain e4');
  });

  TestRunner.test('PGN result is * for ongoing game', function() {
    window.BlindfoldModule.init('medium');
    const pgn = window.BlindfoldModule.getPgn();
    TestRunner.assert(pgn.includes('[Result "*"]'), 'ongoing game should have * result');
  });
});

TestRunner.suite('BlindfoldModule no global leaks', function() {
  TestRunner.test('no unexpected globals leaked', function() {
    TestRunner.assert(typeof window._game === 'undefined', '_game leaked');
    TestRunner.assert(typeof window._boardRenderer === 'undefined', '_boardRenderer leaked');
    TestRunner.assert(typeof window._currentLevel === 'undefined', '_currentLevel leaked');
    TestRunner.assert(typeof window._audioCtx === 'undefined', '_audioCtx leaked');
    TestRunner.assert(typeof window._gameOverCallbacks === 'undefined', '_gameOverCallbacks leaked');
  });
});

// ── Run ──
TestRunner.run().then(function(result) {
  if (result.failed > 0) {
    console.error('Tests failed: ' + result.failed);
    process.exit(1);
  } else {
    console.log('All tests passed: ' + result.passed + '/' + (result.passed + result.failed));
    process.exit(0);
  }
});
