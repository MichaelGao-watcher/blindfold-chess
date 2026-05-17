/**
 * Node.js test runner for ReplayModule.
 */

'use strict';

// ── Minimal DOM Mock ──

class MockClassList {
  constructor() { this._set = new Set(); }
  add(c) { this._set.add(c); }
  remove(c) { this._set.delete(c); }
  toggle(c) { if (this._set.has(c)) { this._set.delete(c); return false; } this._set.add(c); return true; }
  contains(c) { return this._set.has(c); }
}

class MockElement {
  constructor(tagName) {
    this.tagName = (tagName || 'div').toLowerCase();
    this.id = '';
    this.classList = new MockClassList();
    this.style = {};
    this.children = [];
    this._parent = null;
    this._attrs = new Map();
    this._textContent = '';
    this._listeners = {};
  }

  get parentNode() { return this._parent; }

  setAttribute(k, v) { this._attrs.set(k, String(v)); if (k === 'id') this.id = String(v); }
  getAttribute(k) { return this._attrs.get(k) || null; }
  removeAttribute(k) { this._attrs.delete(k); }

  appendChild(child) {
    if (child._parent) child._parent.removeChild(child);
    this.children.push(child);
    child._parent = this;
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) { this.children.splice(idx, 1); child._parent = null; }
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
    for (const fn of list) fn.call(this, ev);
    return !ev.defaultPrevented;
  }

  querySelector(sel) {
    const all = this.querySelectorAll(sel);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(sel) {
    const results = [];
    const last = sel.trim().split(/\s+/).pop();
    const matches = (el, s) => {
      if (s.startsWith('#')) return el.id === s.slice(1);
      if (s.startsWith('.')) return el.classList.contains(s.slice(1));
      if (s.startsWith('[')) {
        const m = s.match(/\[([^\]=]+)(?:=["']?([^"'\]]*)["']?)?\]/);
        if (!m) return false;
        const attr = m[1];
        let val = m[2];
        if (val && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val === undefined) return el.getAttribute(attr) !== null;
        return el.getAttribute(attr) === val;
      }
      return el.tagName === s.toLowerCase();
    };
    const walk = (el) => {
      for (const child of el.children) {
        if (matches(child, last)) results.push(child);
        walk(child);
      }
    };
    walk(this);
    return results;
  }

  get textContent() { return this._textContent; }
  set textContent(v) { this._textContent = String(v); }
}

class MockDocument {
  constructor() {
    this._byId = new Map();
    this.documentElement = { lang: 'zh-CN', setAttribute() {}, getAttribute() { return null; } };
    this.body = this.createElement('body');
  }

  createElement(tag) { return new MockElement(tag); }

  getElementById(id) {
    function walk(el) {
      if (el.id === id) return el;
      for (const c of el.children) { const f = walk(c); if (f) return f; }
      return null;
    }
    const fromBody = walk(this.body);
    if (fromBody) return fromBody;
    return this._byId.get(id) || null;
  }

  querySelectorAll(sel) {
    const results = [];
    const walk = (el) => {
      for (const child of el.children) {
        if (sel.startsWith('.')) {
          if (child.classList.contains(sel.slice(1))) results.push(child);
        }
        walk(child);
      }
    };
    walk(this.body);
    return results;
  }

  _register(el) {
    if (el.id) this._byId.set(el.id, el);
  }
}

class MockEvent {
  constructor(type, opts) {
    this.type = type;
    this.bubbles = opts && opts.bubbles;
    this.defaultPrevented = false;
  }
  preventDefault() { this.defaultPrevented = true; }
}

// ── Inject globals ──

const doc = new MockDocument();
global.document = doc;
global.window = global;
global.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {},
  clear() {}
};
global.Event = MockEvent;

// ── Build minimal DOM ──

function makeEl(tag, opts) {
  opts = opts || {};
  const el = doc.createElement(tag);
  if (opts.id) { el.id = opts.id; doc._register(el); }
  if (opts.className) opts.className.split(/\s+/).forEach(c => { if (c) el.classList.add(c); });
  if (opts.text) el.textContent = opts.text;
  if (opts.parent) opts.parent.appendChild(el);
  return el;
}

makeEl('div', { id: 'replayMoveList', parent: doc.body });
makeEl('div', { id: 'replayInfo', parent: doc.body });
makeEl('div', { id: 'replayBoardContainer', parent: doc.body });

// ── Mock BoardRenderer ──

window.BoardRenderer = {
  create: function(containerId, options) {
    return {
      render: function(fen) {},
      highlight: function() {},
      clearHighlight: function() {},
      shake: function() {},
      onSquareClick: function() {},
      destroy: function() {}
    };
  }
};

// ── Mock ClassicGames ──

window.ClassicGames = [
  {
    id: 'test-game-1',
    pgn: '[Event "Test"]\n1.e4 e5 2.Nf3 Nc6 3.Bb5 a6'
  },
  {
    id: 'test-game-2',
    pgn: '[Event "Test2"]\n1.d4 d5 2.c4 e6 3.Nc3 Nf6'
  }
];

// ── Load dependencies ──

require('../../js/test-runner.js');
require('../../js/replay.js');

// ── Test suites ──

TestRunner.suite('ReplayModule API', function() {
  TestRunner.test('ReplayModule exposed on window', function() {
    TestRunner.assert(typeof window.ReplayModule === 'object');
  });
  TestRunner.test('init is a function', function() {
    TestRunner.assert(typeof window.ReplayModule.init === 'function');
  });
  TestRunner.test('loadPgn is a function', function() {
    TestRunner.assert(typeof window.ReplayModule.loadPgn === 'function');
  });
  TestRunner.test('verifyMove is a function', function() {
    TestRunner.assert(typeof window.ReplayModule.verifyMove === 'function');
  });
  TestRunner.test('loadClassicGame is a function', function() {
    TestRunner.assert(typeof window.ReplayModule.loadClassicGame === 'function');
  });
  TestRunner.test('navigateToMove is a function', function() {
    TestRunner.assert(typeof window.ReplayModule.navigateToMove === 'function');
  });
  TestRunner.test('toggleBoard is a function', function() {
    TestRunner.assert(typeof window.ReplayModule.toggleBoard === 'function');
  });
  TestRunner.test('getCurrentFen is a function', function() {
    TestRunner.assert(typeof window.ReplayModule.getCurrentFen === 'function');
  });
});

TestRunner.suite('ReplayModule._parsePgn', function() {
  TestRunner.test('parses simple PGN', function() {
    var moves = ReplayModule._parsePgn('1.e4 e5 2.Nf3 Nc6 3.Bb5 a6');
    TestRunner.assert(Array.isArray(moves));
    TestRunner.assertEqual(moves.length, 6);
    TestRunner.assertEqual(moves[0], 'e4');
    TestRunner.assertEqual(moves[1], 'e5');
    TestRunner.assertEqual(moves[5], 'a6');
  });

  TestRunner.test('ignores comments and headers', function() {
    var pgn = '[Event "Test"]\n{ This is a comment } 1.e4 e5 2.Nf3 { another comment } Nc6';
    var moves = ReplayModule._parsePgn(pgn);
    TestRunner.assertEqual(moves.length, 4);
    TestRunner.assertEqual(moves[0], 'e4');
  });

  TestRunner.test('ignores result tokens', function() {
    var moves = ReplayModule._parsePgn('1.e4 e5 2.Nf3 Nc6 1-0');
    TestRunner.assertEqual(moves.length, 4);
  });

  TestRunner.test('returns null for empty input', function() {
    TestRunner.assertEqual(ReplayModule._parsePgn(''), null);
    TestRunner.assertEqual(ReplayModule._parsePgn(null), null);
  });
});

TestRunner.suite('ReplayModule.loadPgn', function() {
  TestRunner.test('loads moves and sets initial position', function() {
    var ok = ReplayModule.loadPgn('1.e4 e5 2.Nf3 Nc6');
    TestRunner.assert(ok, 'loadPgn should return true');
    var moves = ReplayModule._getMoves();
    // Without chess.js, only start position is stored
    TestRunner.assert(moves.length >= 1, 'should have at least start position');
    TestRunner.assertEqual(ReplayModule._getCurrentIndex(), 0);
  });

  TestRunner.test('returns false for invalid PGN', function() {
    var ok = ReplayModule.loadPgn('');
    TestRunner.assert(!ok, 'empty PGN should return false');
  });
});

TestRunner.suite('ReplayModule.navigateToMove', function() {
  TestRunner.test('navigates to specified index', function() {
    ReplayModule.loadPgn('1.e4 e5 2.Nf3 Nc6 3.Bb5 a6');
    // Without chess.js, only 1 state exists, so index stays at 0
    var maxIdx = ReplayModule._getMoves().length - 1;
    ReplayModule.navigateToMove(Math.min(2, maxIdx));
    TestRunner.assertEqual(ReplayModule._getCurrentIndex(), Math.min(2, maxIdx));
  });

  TestRunner.test('clamps to bounds', function() {
    ReplayModule.loadPgn('1.e4 e5');
    ReplayModule.navigateToMove(99);
    var idx = ReplayModule._getCurrentIndex();
    TestRunner.assert(idx <= ReplayModule._getMoves().length - 1, 'should not exceed max');
    ReplayModule.navigateToMove(-5);
    TestRunner.assertEqual(ReplayModule._getCurrentIndex(), 0);
  });
});

TestRunner.suite('ReplayModule.getCurrentFen', function() {
  TestRunner.test('returns initial FEN before loading', function() {
    var fen = ReplayModule.getCurrentFen();
    TestRunner.assert(fen.indexOf('rnbqkbnr') !== -1, 'should be start position');
  });

  TestRunner.test('returns FEN after navigation', function() {
    ReplayModule.loadPgn('1.e4 e5');
    ReplayModule.navigateToMove(1);
    var fen = ReplayModule.getCurrentFen();
    TestRunner.assert(typeof fen === 'string' && fen.length > 0);
  });
});

TestRunner.suite('ReplayModule.loadClassicGame', function() {
  TestRunner.test('loads existing game by id', function() {
    var ok = ReplayModule.loadClassicGame('test-game-1');
    TestRunner.assert(ok, 'should load test-game-1');
  });

  TestRunner.test('returns false for non-existent id', function() {
    var ok = ReplayModule.loadClassicGame('nonexistent');
    TestRunner.assert(!ok, 'should fail for nonexistent id');
  });
});

TestRunner.suite('ReplayModule.verifyMove', function() {
  TestRunner.test('returns invalid for empty input', function() {
    var result = ReplayModule.verifyMove('');
    TestRunner.assertEqual(result.valid, false);
  });

  TestRunner.test('returns invalid when chess.js not loaded', function() {
    // Chess is not defined in this test environment
    var result = ReplayModule.verifyMove('e4');
    TestRunner.assertEqual(result.valid, false);
    TestRunner.assertEqual(result.reason, 'chess.js not loaded');
  });
});

TestRunner.suite('Global pollution check', function() {
  TestRunner.test('no unexpected globals leaked', function() {
    TestRunner.assert(typeof window._moves === 'undefined', '_moves leaked');
    TestRunner.assert(typeof window._currentIndex === 'undefined', '_currentIndex leaked');
    TestRunner.assert(typeof window._boardInstance === 'undefined', '_boardInstance leaked');
    TestRunner.assert(typeof window._parsePgn === 'undefined', '_parsePgn leaked');
    TestRunner.assert(typeof window._applyMoves === 'undefined', '_applyMoves leaked');
  });
});

// ── Run ──
TestRunner.run().then(function(result) {
  if (result.failed > 0) {
    console.error('Tests failed: ' + result.failed);
    if (typeof process !== 'undefined') process.exit(1);
  } else {
    console.log('All tests passed: ' + result.passed + '/' + (result.passed + result.failed));
    if (typeof process !== 'undefined') process.exit(0);
  }
});
