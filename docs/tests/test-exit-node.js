/**
 * Node.js test runner for ExitModule.
 * Provides a minimal DOM mock so that exit.js can load and run
 * without a real browser.
 */

'use strict';

// =====================================================================
//  Minimal DOM Mock
// =====================================================================

class MockClassList {
  constructor() { this._set = new Set(); }
  add(c) { this._set.add(c); }
  remove(c) { this._set.delete(c); }
  toggle(c) {
    if (this._set.has(c)) { this._set.delete(c); return false; }
    this._set.add(c); return true;
  }
  contains(c) { return this._set.has(c); }
}

class MockElement {
  constructor(tagName) {
    this.tagName = (tagName || 'div').toLowerCase();
    this.id = '';
    this._classList = new MockClassList();
    this.style = {};
    this.children = [];
    this._parent = null;
    this._attrs = new Map();
    this._textContent = '';
    this._listeners = {};
  }

  get classList() { return this._classList; }

  get className() { return Array.from(this._classList._set).join(' '); }
  set className(v) {
    this._classList._set.clear();
    if (v) v.split(/\s+/).forEach(function(c) { if (c) this._classList._set.add(c); }.bind(this));
  }

  get parentNode() { return this._parent; }

  setAttribute(k, v) {
    this._attrs.set(k, String(v));
    if (k === 'id') this.id = String(v);
  }

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
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child._parent = null;
    }
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

  contains(node) {
    if (node === this) return true;
    for (const child of this.children) {
      if (child.contains && child.contains(node)) return true;
    }
    return false;
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

  querySelector(sel) {
    const all = this.querySelectorAll(sel);
    return all.length > 0 ? all[0] : null;
  }

  get textContent() { return this._textContent; }
  set textContent(v) { this._textContent = String(v); }
}

class MockDocumentElement {
  constructor() {
    this.lang = 'zh-CN';
    this._attrs = new Map();
  }
  setAttribute(k, v) { this._attrs.set(k, String(v)); }
  getAttribute(k) { return this._attrs.get(k) || null; }
}

class MockEvent {
  constructor(type, opts) {
    this.type = type;
    this.bubbles = opts && opts.bubbles;
    this.defaultPrevented = false;
    this.target = opts && opts.target || null;
  }
  stopPropagation() {}
  preventDefault() { this.defaultPrevented = true; }
}

class MockStorage {
  constructor() { this._data = new Map(); }
  getItem(k) { return this._data.has(k) ? this._data.get(k) : null; }
  setItem(k, v) { this._data.set(k, String(v)); }
  removeItem(k) { this._data.delete(k); }
  clear() { this._data.clear(); }
}

// Build document mock
const docEl = new MockDocumentElement();
const body = new MockElement('body');

const _doc = {
  documentElement: docEl,
  body: body,
  createElement(tag) { return new MockElement(tag); },

  getElementById(id) {
    function walk(el) {
      if (el.id === id) return el;
      for (const child of el.children) {
        const found = walk(child);
        if (found) return found;
      }
      return null;
    }
    return walk(body);
  },

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
    walk(body);
    return results;
  },

  querySelector(sel) {
    const all = this.querySelectorAll(sel);
    return all.length > 0 ? all[0] : null;
  }
};

// =====================================================================
//  Inject globals
// =====================================================================

global.document = _doc;
global.window = global;
global.localStorage = new MockStorage();
global.sessionStorage = new MockStorage();
global.requestAnimationFrame = function(fn) { fn(); return 0; };
global.cancelAnimationFrame = function() {};
global.Event = MockEvent;

// =====================================================================
//  Build minimal DOM tree matching index.html exitScreen area
// =====================================================================

function makeEl(tag, opts) {
  opts = opts || {};
  const el = _doc.createElement(tag);
  if (opts.id) el.id = opts.id;
  if (opts.className) {
    opts.className.split(/\s+/).forEach(function(c) {
      if (c) el.classList.add(c);
    });
  }
  if (opts.text) el.textContent = opts.text;
  if (opts.parent) opts.parent.appendChild(el);
  if (opts.attr) {
    for (const k in opts.attr) el.setAttribute(k, opts.attr[k]);
  }
  return el;
}

// Several screens to test showExitScreen switching
makeEl('div', { id: 'startScreen', className: 'screen active', parent: body });
makeEl('div', { id: 'gameScreen', className: 'screen hidden', parent: body });
makeEl('div', { id: 'coordinateScreen', className: 'screen hidden', parent: body });

// The exitScreen itself
const exitScreen = makeEl('div', { id: 'exitScreen', className: 'screen hidden', parent: body });
const exitBrand = makeEl('div', { className: 'brand', parent: exitScreen });
makeEl('h1', { attr: { 'data-i18n': 'exitTitle' }, text: 'See you next time!', parent: exitBrand });
makeEl('p', { attr: { 'data-i18n': 'exitDesc' }, text: "You can close this tab whenever you're ready.", parent: exitBrand });

// =====================================================================
//  Load dependencies
// =====================================================================

require('../../js/test-runner.js');
require('../../js/exit.js');
window.ExitModule._typewriterEnabled = false;

// =====================================================================
//  Helper utilities
// =====================================================================

function resetScreens() {
  ['startScreen', 'gameScreen', 'coordinateScreen', 'exitScreen'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('active');
      el.classList.add('hidden');
    }
  });
  const start = document.getElementById('startScreen');
  if (start) {
    start.classList.remove('hidden');
    start.classList.add('active');
  }
}

function isActive(id) {
  const el = document.getElementById(id);
  return el && el.classList.contains('active') && !el.classList.contains('hidden');
}

function isHidden(id) {
  const el = document.getElementById(id);
  return !el || el.classList.contains('hidden');
}

function getText(sel) {
  const el = (typeof sel === 'string' && sel.startsWith('#'))
    ? document.getElementById(sel.slice(1))
    : exitScreen.querySelector(sel);
  return el ? el.textContent : null;
}

function mockSettingsLang(lang) {
  window.SettingsModule = {
    get: function(key) {
      if (key === 'lang') return lang;
      return null;
    }
  };
}

function clearSettingsMock() {
  delete window.SettingsModule;
}

// =====================================================================
//  Test suites
// =====================================================================

TestRunner.suite('ExitModule API', function() {
  TestRunner.test('ExitModule exposed on window', function() {
    TestRunner.assert(typeof window.ExitModule === 'object', 'ExitModule not exposed');
  });

  TestRunner.test('init is a function', function() {
    TestRunner.assert(typeof window.ExitModule.init === 'function', 'init not a function');
  });

  TestRunner.test('showExitScreen is a function', function() {
    TestRunner.assert(typeof window.ExitModule.showExitScreen === 'function', 'showExitScreen not a function');
  });

  TestRunner.test('getRandomLine is a function', function() {
    TestRunner.assert(typeof window.ExitModule.getRandomLine === 'function', 'getRandomLine not a function');
  });
});

TestRunner.suite('ExitModule.getRandomLine — coverage', function() {
  const zhSet = new Set([
    '这对我来说太难了，我要去打开 TikTok 放松一下',
    '一代天才，就此陨落',
    '我的棋子刚才集体辞职了，说压力太大',
    '大脑内存不足，请关闭部分脑细胞再试',
    '棋手未老，棋先丢，盲棋不易，且行且珍惜',
    '此局太虐，朕要退朝了',
    '我的盲棋生涯，始于雄心，终于失忆',
    '对方一定开了挂，我要下线去举报',
    '我只是在测试浏览器的关闭按钮灵不灵',
    '棋输人不输，TikTok 不能不看',
    '看来我的脑内棋盘需要系统维护了',
    '这不是退出，这是战略性转移'
  ]);

  const enSet = new Set([
    "This is too hard for me. I'm going to open TikTok and relax.",
    'A brilliant mind, fallen just like that.',
    'My pieces just resigned collectively. Too much pressure.',
    'Brain memory insufficient. Please close some neurons and try again.',
    'The player is not old, but the pieces are lost. Blindfold chess is hard—cherish every move.',
    'This game is too brutal. His Majesty is leaving the court.',
    'My blindfold career began with ambition, ended with amnesia.',
    "The opponent must be cheating. I'm logging off to report them.",
    "I'm just testing if the browser close button works.",
    'Lost the game, not my dignity. TikTok is waiting.',
    'Looks like my mental chessboard needs system maintenance.',
    "This isn't quitting. It's a strategic retreat."
  ]);

  TestRunner.test('returns one of the Chinese lines by default', function() {
    clearSettingsMock();
    const line = window.ExitModule.getRandomLine();
    TestRunner.assert(zhSet.has(line), 'unexpected default line: ' + line);
  });

  TestRunner.test('returns one of the English lines when lang=en', function() {
    mockSettingsLang('en');
    const line = window.ExitModule.getRandomLine();
    TestRunner.assert(enSet.has(line), 'unexpected en line: ' + line);
    clearSettingsMock();
  });

  TestRunner.test('full zh coverage within 200 draws', function() {
    clearSettingsMock();
    const seen = new Set();
    for (var i = 0; i < 200; i++) {
      seen.add(window.ExitModule.getRandomLine());
    }
    TestRunner.assertEqual(seen.size, 12, 'expected all 12 zh lines, got ' + seen.size);
  });

  TestRunner.test('full en coverage within 200 draws', function() {
    mockSettingsLang('en');
    const seen = new Set();
    for (var i = 0; i < 200; i++) {
      seen.add(window.ExitModule.getRandomLine());
    }
    TestRunner.assertEqual(seen.size, 12, 'expected all 12 en lines, got ' + seen.size);
    clearSettingsMock();
  });

  TestRunner.test('does not return the same line consecutively too often', function() {
    clearSettingsMock();
    var prev = window.ExitModule.getRandomLine();
    var repeats = 0;
    for (var i = 0; i < 20; i++) {
      var curr = window.ExitModule.getRandomLine();
      if (curr === prev) repeats++;
      prev = curr;
    }
    TestRunner.assert(repeats <= 2, 'too many consecutive repeats: ' + repeats);
  });
});

TestRunner.suite('ExitModule language switching', function() {
  const zhLines = [
    '这对我来说太难了，我要去打开 TikTok 放松一下',
    '一代天才，就此陨落',
    '我的棋子刚才集体辞职了，说压力太大',
    '大脑内存不足，请关闭部分脑细胞再试',
    '棋手未老，棋先丢，盲棋不易，且行且珍惜',
    '此局太虐，朕要退朝了',
    '我的盲棋生涯，始于雄心，终于失忆',
    '对方一定开了挂，我要下线去举报',
    '我只是在测试浏览器的关闭按钮灵不灵',
    '棋输人不输，TikTok 不能不看',
    '看来我的脑内棋盘需要系统维护了',
    '这不是退出，这是战略性转移'
  ];

  const enLines = [
    "This is too hard for me. I'm going to open TikTok and relax.",
    'A brilliant mind, fallen just like that.',
    'My pieces just resigned collectively. Too much pressure.',
    'Brain memory insufficient. Please close some neurons and try again.',
    'The player is not old, but the pieces are lost. Blindfold chess is hard—cherish every move.',
    'This game is too brutal. His Majesty is leaving the court.',
    'My blindfold career began with ambition, ended with amnesia.',
    "The opponent must be cheating. I'm logging off to report them.",
    "I'm just testing if the browser close button works.",
    'Lost the game, not my dignity. TikTok is waiting.',
    'Looks like my mental chessboard needs system maintenance.',
    "This isn't quitting. It's a strategic retreat."
  ];

  TestRunner.test('all zh lines appear', function() {
    mockSettingsLang('zh');
    var seen = new Set();
    for (var i = 0; i < 200; i++) {
      seen.add(window.ExitModule.getRandomLine());
    }
    zhLines.forEach(function(line) {
      TestRunner.assert(seen.has(line), 'missing zh line: ' + line);
    });
    clearSettingsMock();
  });

  TestRunner.test('all en lines appear', function() {
    mockSettingsLang('en');
    var seen = new Set();
    for (var i = 0; i < 200; i++) {
      seen.add(window.ExitModule.getRandomLine());
    }
    enLines.forEach(function(line) {
      TestRunner.assert(seen.has(line), 'missing en line: ' + line);
    });
    clearSettingsMock();
  });

  TestRunner.test('falls back to zh when SettingsModule missing', function() {
    clearSettingsMock();
    var line = window.ExitModule.getRandomLine();
    var knownZh = new Set(zhLines);
    TestRunner.assert(knownZh.has(line), 'fallback to zh failed, got: ' + line);
  });

  TestRunner.test('falls back to zh when SettingsModule returns invalid lang', function() {
    window.SettingsModule = { get: function() { return 'fr'; } };
    var line = window.ExitModule.getRandomLine();
    var knownZh = new Set(zhLines);
    TestRunner.assert(knownZh.has(line), 'fallback to zh on invalid lang failed, got: ' + line);
    clearSettingsMock();
  });
});

TestRunner.suite('ExitModule.showExitScreen', function() {
  TestRunner.test('shows exitScreen', function() {
    resetScreens();
    window.ExitModule.showExitScreen();
    TestRunner.assert(isActive('exitScreen'), 'exitScreen should be active');
  });

  TestRunner.test('hides all other screens', function() {
    resetScreens();
    window.ExitModule.showExitScreen();
    TestRunner.assert(isHidden('startScreen'), 'startScreen should be hidden');
    TestRunner.assert(isHidden('gameScreen'), 'gameScreen should be hidden');
    TestRunner.assert(isHidden('coordinateScreen'), 'coordinateScreen should be hidden');
  });

  TestRunner.test('injects humor line element', function() {
    resetScreens();
    window.ExitModule.showExitScreen();
    var lineEl = exitScreen.querySelector('.exit-humor-line');
    TestRunner.assert(lineEl !== null, 'humor line element should be injected');
  });

  TestRunner.test('injects button elements', function() {
    resetScreens();
    window.ExitModule.showExitScreen();
    var confirmBtn = document.getElementById('exitConfirmBtn');
    var againBtn = document.getElementById('exitAgainBtn');
    TestRunner.assert(confirmBtn !== null, 'confirm button should be injected');
    TestRunner.assert(againBtn !== null, 'again button should be injected');
  });

  TestRunner.test('button labels are Chinese by default', function() {
    clearSettingsMock();
    resetScreens();
    window.ExitModule.showExitScreen();
    TestRunner.assertEqual(getText('#exitConfirmBtn'), '确认退出');
    TestRunner.assertEqual(getText('#exitAgainBtn'), '再玩一局');
  });

  TestRunner.test('button labels switch to English when lang=en', function() {
    mockSettingsLang('en');
    resetScreens();
    window.ExitModule.showExitScreen();
    TestRunner.assertEqual(getText('#exitConfirmBtn'), 'Confirm Exit');
    TestRunner.assertEqual(getText('#exitAgainBtn'), 'Play Again');
    clearSettingsMock();
  });

  TestRunner.test('humor line text is non-empty after show', function() {
    clearSettingsMock();
    resetScreens();
    window.ExitModule.showExitScreen();
    var text = getText('.exit-humor-line');
    TestRunner.assert(text && text.length > 0, 'humor line should not be empty');
  });
});

TestRunner.suite('ExitModule.init', function() {
  TestRunner.test('does not throw with valid DOM', function() {
    resetScreens();
    var threw = false;
    try {
      window.ExitModule.init();
    } catch (e) {
      threw = true;
    }
    TestRunner.assert(!threw, 'init should not throw with valid DOM');
  });

  TestRunner.test('injectes elements on init', function() {
    resetScreens();
    // Clear any previously injected elements by rebuilding the brand
    exitBrand.children.length = 0;
    // Re-add original children
    makeEl('h1', { attr: { 'data-i18n': 'exitTitle' }, text: 'See you next time!', parent: exitBrand });
    makeEl('p', { attr: { 'data-i18n': 'exitDesc' }, text: "You can close this tab whenever you're ready.", parent: exitBrand });

    window.ExitModule.init();
    TestRunner.assert(exitScreen.querySelector('.exit-humor-line') !== null, 'humor line should exist after init');
    TestRunner.assert(document.getElementById('exitConfirmBtn') !== null, 'confirm button should exist after init');
  });
});

TestRunner.suite('Global pollution check', function() {
  TestRunner.test('no unexpected globals leaked', function() {
    TestRunner.assert(typeof window._lines === 'undefined', '_lines leaked');
    TestRunner.assert(typeof window._lastIndex === 'undefined', '_lastIndex leaked');
    TestRunner.assert(typeof window._getLang === 'undefined', '_getLang leaked');
    TestRunner.assert(typeof window._hideAllScreens === 'undefined', '_hideAllScreens leaked');
    TestRunner.assert(typeof window._showScreen === 'undefined', '_showScreen leaked');
    TestRunner.assert(typeof window._buildExitScreen === 'undefined', '_buildExitScreen leaked');
    TestRunner.assert(typeof window._updateButtonLabels === 'undefined', '_updateButtonLabels leaked');
    TestRunner.assert(typeof window._typewriterTimer === 'undefined', '_typewriterTimer leaked');
    TestRunner.assert(typeof window._clearTypewriter === 'undefined', '_clearTypewriter leaked');
    TestRunner.assert(typeof window._startTypewriter === 'undefined', '_startTypewriter leaked');
  });
});

// =====================================================================
//  Run
// =====================================================================
TestRunner.run().then(function(result) {
  if (result.failed > 0) {
    console.error('Tests failed: ' + result.failed);
    if (typeof process !== 'undefined') process.exit(1);
  } else {
    console.log('All tests passed: ' + result.passed + '/' + (result.passed + result.failed));
    if (typeof process !== 'undefined') process.exit(0);
  }
});
