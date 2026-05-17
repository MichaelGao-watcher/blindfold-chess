/**
 * Node.js test runner for GuideModule.
 * Provides a minimal DOM mock so that guide.js can load and run
 * without a real browser.
 */

'use strict';

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
}

function matches(el, sel) {
  if (sel.startsWith('#')) return el.id === sel.slice(1);
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
  if (sel.startsWith('[') && sel.endsWith(']')) {
    const inner = sel.slice(1, -1);
    const eqIdx = inner.indexOf('=');
    if (eqIdx !== -1) {
      const attr = inner.slice(0, eqIdx);
      let val = inner.slice(eqIdx + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      return el.getAttribute(attr) === val;
    } else {
      return el.getAttribute(inner) !== null;
    }
  }
  return el.tagName === sel.toLowerCase();
}

class MockClassList {
  constructor(el) { this._el = el; this._set = new Set(); }
  add(cls) { this._set.add(cls); }
  remove(cls) { this._set.delete(cls); }
  toggle(cls) { if (this._set.has(cls)) this._set.delete(cls); else this._set.add(cls); }
  contains(cls) { return this._set.has(cls); }
}

class MockDocument {
  constructor() {
    this._elements = [];
    this._byId = new Map();
    this.documentElement = { lang: 'zh-CN', setAttribute() {}, getAttribute() { return null; } };
    this.body = this.createElement('body');
  }

  createElement(tag) {
    return new MockElement(tag);
  }

  getElementById(id) {
    return this._byId.get(id) || null;
  }

  querySelectorAll(sel) {
    return this.body.querySelectorAll(sel);
  }

  _register(el) {
    if (el.id) this._byId.set(el.id, el);
    this._elements.push(el);
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
Object.defineProperty(global, 'navigator', {
  value: {
    hardwareConcurrency: 4,
    deviceMemory: 8,
    userAgent: 'NodeTest/1.0'
  },
  writable: true,
  configurable: true
});
global.localStorage = new MockStorage();
global.sessionStorage = new MockStorage();
global.requestAnimationFrame = function(fn) { fn(); return 0; };
global.cancelAnimationFrame = function(id) { clearTimeout(id); };
global.console = global.console || { log() {}, warn() {}, error() {} };
global.Event = MockEvent;

// ── Build minimal DOM tree matching index.html guide / basics screens ──

function buildScreen(id, active) {
  const screen = doc.createElement('div');
  screen.id = id;
  screen.classList.add('screen');
  if (!active) screen.classList.add('hidden');
  else screen.classList.add('active');
  doc._register(screen);
  doc.body.appendChild(screen);
  return screen;
}

// Start screen
buildScreen('startScreen', true);

// Guide screen
const guideScreen = buildScreen('guideScreen', false);

const guideBack = doc.createElement('button');
guideBack.classList.add('back-btn');
guideScreen.appendChild(guideBack);

const guideBrand = doc.createElement('div');
guideBrand.classList.add('brand');
guideScreen.appendChild(guideBrand);

const guideTitle = doc.createElement('h1');
guideTitle.setAttribute('data-i18n', 'guideTitle');
guideTitle.textContent = '入门指南';
guideBrand.appendChild(guideTitle);

const guideSubtitle = doc.createElement('p');
guideSubtitle.setAttribute('data-i18n', 'guideSubtitle');
guideSubtitle.textContent = '选择你想开始的入口。';
guideBrand.appendChild(guideSubtitle);

const guideModes = doc.createElement('div');
guideModes.classList.add('modes');
guideScreen.appendChild(guideModes);

function makeModeCard(titleKey, descKey, descText) {
  const card = doc.createElement('div');
  card.classList.add('mode-card');
  const title = doc.createElement('div');
  title.classList.add('mode-title');
  title.setAttribute('data-i18n', titleKey);
  title.textContent = titleKey;
  card.appendChild(title);
  if (descKey) {
    const desc = doc.createElement('div');
    desc.classList.add('mode-desc');
    desc.setAttribute('data-i18n', descKey);
    desc.textContent = descText || descKey;
    card.appendChild(desc);
  }
  guideModes.appendChild(card);
  return card;
}

makeModeCard('guideBasics', 'guideBasicsDesc', '我完全不知道怎么下，需要从基础开始。');
makeModeCard('guidePractice', 'guidePracticeDesc', '跳过教学，直接与 Stockfish 对弈。');
makeModeCard('guideExit', null, null);

// Basics screen
const basicsScreen = buildScreen('basicsScreen', false);

const basicsBack = doc.createElement('button');
basicsBack.classList.add('back-btn');
basicsScreen.appendChild(basicsBack);

const basicsBrand = doc.createElement('div');
basicsBrand.classList.add('brand');
basicsScreen.appendChild(basicsBrand);

const basicsTitle = doc.createElement('h1');
basicsTitle.setAttribute('data-i18n', 'basicsTitle');
basicsTitle.textContent = '基础知识';
basicsBrand.appendChild(basicsTitle);

const basicsSubtitle = doc.createElement('p');
basicsSubtitle.setAttribute('data-i18n', 'basicsSubtitle');
basicsSubtitle.textContent = '入门所需的一切。';
basicsBrand.appendChild(basicsSubtitle);

const basicsModes = doc.createElement('div');
basicsModes.classList.add('modes');
basicsScreen.appendChild(basicsModes);

const basicsContent = doc.createElement('div');
basicsModes.appendChild(basicsContent);

function makeBasicsItem(titleKey, descKey) {
  const title = doc.createElement('p');
  title.setAttribute('data-i18n', titleKey);
  title.textContent = titleKey;
  basicsContent.appendChild(title);
  const desc = doc.createElement('p');
  desc.setAttribute('data-i18n', descKey);
  desc.textContent = descKey;
  basicsContent.appendChild(desc);
}

makeBasicsItem('basicsCoords', 'basicsCoordsDesc');
makeBasicsItem('basicsNotation', 'basicsNotationDesc');
makeBasicsItem('basicsBlindfold', 'basicsBlindfoldDesc');

// Difficulty screen
buildScreen('difficultyScreen', false);

// ── Load TestRunner ──
require('../../js/test-runner.js');

// ── Load GuideModule ──
require('../../js/guide.js');

// ── Helper utilities ──

function resetScreens() {
  doc._byId.forEach(function(el) {
    if (el.classList.contains('screen')) {
      el.classList.remove('active');
      el.classList.add('hidden');
    }
  });
  const ss = doc.getElementById('startScreen');
  ss.classList.remove('hidden');
  ss.classList.add('active');
}

function clickElement(el) {
  if (!el) throw new Error('Element not found');
  const ev = new MockEvent('click', { bubbles: true });
  el.dispatchEvent(ev);
}

function isActive(id) {
  const el = doc.getElementById(id);
  return el && el.classList.contains('active') && !el.classList.contains('hidden');
}

function isHidden(id) {
  const el = doc.getElementById(id);
  return !el || el.classList.contains('hidden');
}

// ── Test suites ──

TestRunner.suite('GuideModule API', function() {
  TestRunner.test('GuideModule exposed on window', function() {
    TestRunner.assert(typeof window.GuideModule === 'object', 'GuideModule not exposed');
  });
  TestRunner.test('init is a function', function() {
    TestRunner.assert(typeof window.GuideModule.init === 'function', 'init not a function');
  });
  TestRunner.test('showSection is a function', function() {
    TestRunner.assert(typeof window.GuideModule.showSection === 'function', 'showSection not a function');
  });
});

TestRunner.suite('GuideModule.showSection navigation', function() {
  TestRunner.test('showSection(menu) shows guideScreen', function() {
    resetScreens();
    window.GuideModule.showSection('menu');
    TestRunner.assert(isActive('guideScreen'), 'guideScreen should be active');
    TestRunner.assert(isHidden('startScreen'), 'startScreen should be hidden');
  });

  TestRunner.test('showSection(guide) shows guideScreen', function() {
    resetScreens();
    window.GuideModule.showSection('guide');
    TestRunner.assert(isActive('guideScreen'), 'guideScreen should be active');
  });

  TestRunner.test('showSection(basics) shows basicsScreen', function() {
    resetScreens();
    window.GuideModule.showSection('basics');
    TestRunner.assert(isActive('basicsScreen'), 'basicsScreen should be active');
    TestRunner.assert(isHidden('guideScreen'), 'guideScreen should be hidden');
  });

  TestRunner.test('showSection(start) shows startScreen', function() {
    resetScreens();
    window.GuideModule.showSection('menu');
    window.GuideModule.showSection('start');
    TestRunner.assert(isActive('startScreen'), 'startScreen should be active');
    TestRunner.assert(isHidden('guideScreen'), 'guideScreen should be hidden');
  });

  TestRunner.test('showSection(difficulty) shows difficultyScreen', function() {
    resetScreens();
    window.GuideModule.showSection('difficulty');
    TestRunner.assert(isActive('difficultyScreen'), 'difficultyScreen should be active');
    TestRunner.assert(isHidden('startScreen'), 'startScreen should be hidden');
  });

  TestRunner.test('showSection(unknown) returns false', function() {
    var result = window.GuideModule.showSection('unknown');
    TestRunner.assertEqual(result, false);
  });
});

TestRunner.suite('GuideModule button clicks', function() {
  TestRunner.test('guide back button navigates to start', function() {
    resetScreens();
    window.GuideModule.init();
    window.GuideModule.showSection('menu');
    var backBtn = doc.getElementById('guideScreen').querySelector('.back-btn');
    clickElement(backBtn);
    TestRunner.assert(isActive('startScreen'), 'startScreen should be active after back');
    TestRunner.assert(isHidden('guideScreen'), 'guideScreen should be hidden after back');
  });

  TestRunner.test('basics back button navigates to guide menu', function() {
    resetScreens();
    window.GuideModule.init();
    window.GuideModule.showSection('basics');
    var backBtn = doc.getElementById('basicsScreen').querySelector('.back-btn');
    clickElement(backBtn);
    TestRunner.assert(isActive('guideScreen'), 'guideScreen should be active after back');
    TestRunner.assert(isHidden('basicsScreen'), 'basicsScreen should be hidden after back');
  });

  TestRunner.test('basics card navigates to basics', function() {
    resetScreens();
    window.GuideModule.init();
    window.GuideModule.showSection('menu');
    var card = doc.getElementById('guideScreen').querySelectorAll('.mode-card')[0];
    clickElement(card);
    TestRunner.assert(isActive('basicsScreen'), 'basicsScreen should be active');
    TestRunner.assert(isHidden('guideScreen'), 'guideScreen should be hidden');
  });

  TestRunner.test('practice card navigates to difficulty', function() {
    resetScreens();
    window.GuideModule.init();
    window.GuideModule.showSection('menu');
    var card = doc.getElementById('guideScreen').querySelectorAll('.mode-card')[1];
    clickElement(card);
    TestRunner.assert(isActive('difficultyScreen'), 'difficultyScreen should be active');
    TestRunner.assert(isHidden('guideScreen'), 'guideScreen should be hidden');
  });
});

TestRunner.suite('GuideModule content rendering', function() {
  TestRunner.test('guide menu texts render in Chinese', function() {
    localStorage.setItem('lang', 'zh');
    resetScreens();
    window.GuideModule.showSection('menu');
    var title = doc.querySelectorAll('[data-i18n="guideTitle"]')[0];
    TestRunner.assertEqual(title.textContent, '入门指南');
  });

  TestRunner.test('guide menu texts render in English', function() {
    localStorage.setItem('lang', 'en');
    resetScreens();
    window.GuideModule.showSection('menu');
    var title = doc.querySelectorAll('[data-i18n="guideTitle"]')[0];
    TestRunner.assertEqual(title.textContent, 'Getting Started');
  });

  TestRunner.test('basics content renders in Chinese', function() {
    localStorage.setItem('lang', 'zh');
    resetScreens();
    window.GuideModule.showSection('basics');
    var title = doc.querySelectorAll('[data-i18n="basicsTitle"]')[0];
    TestRunner.assertEqual(title.textContent, '基础知识');
    var coords = doc.querySelectorAll('[data-i18n="basicsCoords"]')[0];
    TestRunner.assertEqual(coords.textContent, '棋盘坐标');
  });

  TestRunner.test('basics content renders in English', function() {
    localStorage.setItem('lang', 'en');
    resetScreens();
    window.GuideModule.showSection('basics');
    var title = doc.querySelectorAll('[data-i18n="basicsTitle"]')[0];
    TestRunner.assertEqual(title.textContent, 'Basics');
    var coords = doc.querySelectorAll('[data-i18n="basicsCoords"]')[0];
    TestRunner.assertEqual(coords.textContent, 'Board Coordinates');
  });
});

TestRunner.suite('GuideModule language switching', function() {
  TestRunner.test('language switch updates guide menu texts', function() {
    localStorage.setItem('lang', 'zh');
    resetScreens();
    window.GuideModule.showSection('menu');
    var title = doc.querySelectorAll('[data-i18n="guideTitle"]')[0];
    TestRunner.assertEqual(title.textContent, '入门指南');

    localStorage.setItem('lang', 'en');
    window.GuideModule.showSection('menu');
    TestRunner.assertEqual(title.textContent, 'Getting Started');
  });

  TestRunner.test('language switch updates basics texts', function() {
    localStorage.setItem('lang', 'zh');
    resetScreens();
    window.GuideModule.showSection('basics');
    var title = doc.querySelectorAll('[data-i18n="basicsTitle"]')[0];
    TestRunner.assertEqual(title.textContent, '基础知识');

    localStorage.setItem('lang', 'en');
    window.GuideModule.showSection('basics');
    TestRunner.assertEqual(title.textContent, 'Basics');
  });
});

TestRunner.suite('Global pollution check', function() {
  TestRunner.test('no unexpected globals leaked', function() {
    TestRunner.assert(typeof window._i18n === 'undefined', '_i18n leaked');
    TestRunner.assert(typeof window._t === 'undefined', '_t leaked');
    TestRunner.assert(typeof window._getScreen === 'undefined', '_getScreen leaked');
    TestRunner.assert(typeof window._showScreen === 'undefined', '_showScreen leaked');
    TestRunner.assert(typeof window._hideScreen === 'undefined', '_hideScreen leaked');
    TestRunner.assert(typeof window._updateGuideTexts === 'undefined', '_updateGuideTexts leaked');
    TestRunner.assert(typeof window._exitApp === 'undefined', '_exitApp leaked');
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
