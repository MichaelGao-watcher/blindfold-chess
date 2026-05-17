/**
 * Node.js test runner for ExitModule.
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

  replaceChild(newChild, oldChild) {
    const idx = this.children.indexOf(oldChild);
    if (idx !== -1) {
      if (newChild._parent) newChild._parent.removeChild(newChild);
      this.children[idx] = newChild;
      newChild._parent = this;
      oldChild._parent = null;
    }
    return oldChild;
  }

  cloneNode(deep) {
    const clone = new MockElement(this.tagName);
    clone.id = this.id;
    for (const c of this.classList._set) clone.classList.add(c);
    for (const [k, v] of this._attrs) clone.setAttribute(k, v);
    for (const key in this.style) clone.style[key] = this.style[key];
    clone._textContent = this._textContent;
    if (deep) {
      for (const child of this.children) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
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

class MockStorage {
  constructor() { this._data = new Map(); }
  getItem(k) { return this._data.has(k) ? this._data.get(k) : null; }
  setItem(k, v) { this._data.set(k, String(v)); }
  removeItem(k) { this._data.delete(k); }
  clear() { this._data.clear(); }
}

// ── Inject globals ──

const doc = new MockDocument();
global.document = doc;
global.window = global;
global.localStorage = new MockStorage();
global.sessionStorage = new MockStorage();
global.requestAnimationFrame = function(fn) { fn(); return 0; };
global.cancelAnimationFrame = function() {};
global.Event = MockEvent;

// ── Build minimal DOM tree ──

function makeEl(tag, opts) {
  opts = opts || {};
  const el = doc.createElement(tag);
  if (opts.id) { el.id = opts.id; doc._register(el); }
  if (opts.className) opts.className.split(/\s+/).forEach(c => { if (c) el.classList.add(c); });
  if (opts.text) el.textContent = opts.text;
  if (opts.parent) opts.parent.appendChild(el);
  return el;
}

const startScreen = makeEl('div', { id: 'startScreen', className: 'screen active', parent: doc.body });
const exitScreen = makeEl('div', { id: 'exitScreen', className: 'screen hidden', parent: doc.body });
makeEl('div', { className: 'brand', parent: exitScreen });

// ── Load dependencies ──

require('../../js/test-runner.js');
require('../../js/exit.js');

// ── Helpers ──

function resetStorage() {
  localStorage.clear();
}

function isActive(id) {
  const el = document.getElementById(id);
  return el && el.classList.contains('active') && !el.classList.contains('hidden');
}

function isHidden(id) {
  const el = document.getElementById(id);
  return !el || el.classList.contains('hidden');
}

function getText(id) {
  const el = document.getElementById(id);
  return el ? el.textContent : null;
}

// ── Test suites ──

TestRunner.suite('ExitModule API', function() {
  TestRunner.test('ExitModule exposed on window', function() {
    TestRunner.assert(typeof window.ExitModule === 'object', 'ExitModule not exposed');
  });
  TestRunner.test('init is a function', function() {
    TestRunner.assert(typeof window.ExitModule.init === 'function');
  });
  TestRunner.test('showExitScreen is a function', function() {
    TestRunner.assert(typeof window.ExitModule.showExitScreen === 'function');
  });
  TestRunner.test('getRandomLine is a function', function() {
    TestRunner.assert(typeof window.ExitModule.getRandomLine === 'function');
  });
});

TestRunner.suite('ExitModule.getRandomLine', function() {
  TestRunner.test('returns a non-empty string', function() {
    var line = window.ExitModule.getRandomLine();
    TestRunner.assert(typeof line === 'string' && line.length > 0, 'line should be non-empty string');
  });

  TestRunner.test('returns Chinese by default', function() {
    resetStorage();
    var line = window.ExitModule.getRandomLine();
    // Check it contains Chinese characters
    TestRunner.assert(/[\u4e00-\u9fff]/.test(line), 'should contain Chinese characters by default');
  });

  TestRunner.test('returns English when lang=en', function() {
    localStorage.setItem('lang', 'en');
    var line = window.ExitModule.getRandomLine();
    TestRunner.assert(!/[\u4e00-\u9fff]/.test(line), 'should not contain Chinese when lang=en');
  });

  TestRunner.test('does not return same line consecutively (with >1 lines)', function() {
    resetStorage();
    var prev = '';
    var allSame = true;
    for (var i = 0; i < 20; i++) {
      var line = window.ExitModule.getRandomLine();
      if (line !== prev) allSame = false;
      prev = line;
    }
    TestRunner.assert(!allSame, 'should vary over 20 calls');
  });

  TestRunner.test('covers multiple unique lines over many calls', function() {
    resetStorage();
    var seen = new Set();
    for (var i = 0; i < 50; i++) {
      seen.add(window.ExitModule.getRandomLine());
    }
    TestRunner.assert(seen.size >= 4, 'should cover at least 4 unique lines over 50 calls, got ' + seen.size);
  });
});

TestRunner.suite('ExitModule.showExitScreen', function() {
  TestRunner.test('shows exitScreen and hides startScreen', function() {
    resetStorage();
    window.ExitModule.showExitScreen();
    TestRunner.assert(isActive('exitScreen'), 'exitScreen should be active');
    TestRunner.assert(isHidden('startScreen'), 'startScreen should be hidden');
  });

  TestRunner.test('injects line text into exitScreen', function() {
    resetStorage();
    window.ExitModule.showExitScreen();
    var line = getText('exitLine');
    TestRunner.assert(typeof line === 'string' && line.length > 0, 'exitLine should have text');
  });

  TestRunner.test('injects buttons into exitScreen', function() {
    resetStorage();
    window.ExitModule.showExitScreen();
    var againBtn = document.getElementById('exitAgainBtn');
    var confirmBtn = document.getElementById('exitConfirmBtn');
    TestRunner.assert(againBtn !== null, 'again button should exist');
    TestRunner.assert(confirmBtn !== null, 'confirm button should exist');
  });
});

TestRunner.suite('ExitModule.init', function() {
  TestRunner.test('does not throw with valid DOM', function() {
    var threw = false;
    try { window.ExitModule.init(); } catch (e) { threw = true; }
    TestRunner.assert(!threw, 'init should not throw');
  });
});

TestRunner.suite('Global pollution check', function() {
  TestRunner.test('no unexpected globals leaked', function() {
    TestRunner.assert(typeof window._lines === 'undefined', '_lines leaked');
    TestRunner.assert(typeof window._lastIndex === 'undefined', '_lastIndex leaked');
    TestRunner.assert(typeof window._getLang === 'undefined', '_getLang leaked');
    TestRunner.assert(typeof window._buildExitScreen === 'undefined', '_buildExitScreen leaked');
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
