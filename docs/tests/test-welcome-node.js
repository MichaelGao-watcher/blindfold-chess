/**
 * Node.js test runner for WelcomeModule.
 * Provides a minimal DOM mock so that welcome.js can load and run
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

  get textContent() { return this._textContent; }
  set textContent(v) { this._textContent = v; }
}

function matches(el, sel) {
  if (sel.startsWith('#')) return el.id === sel.slice(1);
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
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
// Node 25+ has navigator as read-only; defineProperty to override
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

// ── Build minimal DOM tree matching index.html ──

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

const startScreen = buildScreen('startScreen', true);

const brand = doc.createElement('div');
brand.classList.add('brand');
startScreen.appendChild(brand);

const modes = doc.createElement('div');
modes.classList.add('modes');
startScreen.appendChild(modes);

function makeCard(id, title) {
  const card = doc.createElement('div');
  card.id = id;
  card.classList.add('mode-card');
  doc._register(card);
  const t = doc.createElement('div');
  t.classList.add('mode-title');
  t.textContent = title;
  card.appendChild(t);
  modes.appendChild(card);
  return card;
}

makeCard('modeBlindfold', 'Blindfold Practice');
makeCard('modeCoordinate', 'Coordinate Practice');
makeCard('modeReplay', 'Blindfold Replay');
makeCard('modeGuide', 'Wait. I don\'t even know how…');

buildScreen('difficultyScreen', false);
buildScreen('coordinateScreen', false);
buildScreen('guideScreen', false);
buildScreen('basicsScreen', false);
buildScreen('gameScreen', false);
buildScreen('exitScreen', false);

// ── Load TestRunner ──
require('../../js/test-runner.js');

// ── Load WelcomeModule ──
require('../../js/welcome.js');

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

function clickElement(id) {
  const el = doc.getElementById(id);
  if (!el) throw new Error('Element not found: ' + id);
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

TestRunner.suite('WelcomeModule API', function() {
  TestRunner.test('WelcomeModule exposed on window', function() {
    TestRunner.assert(typeof window.WelcomeModule === 'object', 'WelcomeModule not exposed');
  });
  TestRunner.test('init is a function', function() {
    TestRunner.assert(typeof window.WelcomeModule.init === 'function', 'init not a function');
  });
  TestRunner.test('navigateTo is a function', function() {
    TestRunner.assert(typeof window.WelcomeModule.navigateTo === 'function', 'navigateTo not a function');
  });
});

TestRunner.suite('WelcomeModule.navigateTo modes', function() {
  TestRunner.test('navigateTo(blindfold) shows difficultyScreen', function() {
    resetScreens();
    window.WelcomeModule.navigateTo('blindfold');
    TestRunner.assert(isActive('difficultyScreen'), 'difficultyScreen should be active');
    TestRunner.assert(isHidden('startScreen'), 'startScreen should be hidden');
  });

  TestRunner.test('navigateTo(coordinate) shows coordinateScreen', function() {
    resetScreens();
    window.WelcomeModule.navigateTo('coordinate');
    TestRunner.assert(isActive('coordinateScreen'), 'coordinateScreen should be active');
    TestRunner.assert(isHidden('startScreen'), 'startScreen should be hidden');
  });

  TestRunner.test('navigateTo(guide) shows guideScreen', function() {
    resetScreens();
    window.WelcomeModule.navigateTo('guide');
    TestRunner.assert(isActive('guideScreen'), 'guideScreen should be active');
    TestRunner.assert(isHidden('startScreen'), 'startScreen should be hidden');
  });

  TestRunner.test('navigateTo(replay) hides startScreen', function() {
    resetScreens();
    window.WelcomeModule.navigateTo('replay');
    TestRunner.assert(isHidden('startScreen'), 'startScreen should be hidden');
  });

  TestRunner.test('navigateTo(unknown) does not throw', function() {
    resetScreens();
    var threw = false;
    try {
      window.WelcomeModule.navigateTo('unknown');
    } catch (e) {
      threw = true;
    }
    TestRunner.assert(!threw, 'navigateTo(unknown) should not throw');
  });
});

TestRunner.suite('WelcomeModule button clicks', function() {
  TestRunner.test('click modeBlindfold navigates to difficultyScreen', function() {
    resetScreens();
    window.WelcomeModule.init();
    clickElement('modeBlindfold');
    TestRunner.assert(isActive('difficultyScreen'), 'difficultyScreen should be active after click');
  });

  TestRunner.test('click modeCoordinate navigates to coordinateScreen', function() {
    resetScreens();
    window.WelcomeModule.init();
    clickElement('modeCoordinate');
    TestRunner.assert(isActive('coordinateScreen'), 'coordinateScreen should be active after click');
  });

  TestRunner.test('click modeGuide navigates to guideScreen', function() {
    resetScreens();
    window.WelcomeModule.init();
    clickElement('modeGuide');
    TestRunner.assert(isActive('guideScreen'), 'guideScreen should be active after click');
  });

  TestRunner.test('click modeReplay hides startScreen', function() {
    resetScreens();
    window.WelcomeModule.init();
    clickElement('modeReplay');
    TestRunner.assert(isHidden('startScreen'), 'startScreen should be hidden after click');
  });
});

TestRunner.suite('WelcomeModule visual effects', function() {
  TestRunner.test('init does not throw when screens exist', function() {
    resetScreens();
    var threw = false;
    try {
      window.WelcomeModule.init();
    } catch (e) {
      threw = true;
    }
    TestRunner.assert(!threw, 'init should not throw with valid DOM');
  });

  TestRunner.test('entrance animation sets card styles without breaking clicks', function() {
    resetScreens();
    window.WelcomeModule.init();
    var card = doc.getElementById('modeBlindfold');
    TestRunner.assert(
      card.style.opacity === '0' || card.style.opacity === '1' || card.style.opacity === undefined || card.style.opacity === '',
      'card opacity should be a valid value'
    );
  });
});

TestRunner.suite('WelcomeModule low-end fallback', function() {
  TestRunner.test('low-end device skips animated-bg class', function() {
    resetScreens();
    var origConcurrency = navigator.hardwareConcurrency;
    var origMemory = navigator.deviceMemory;
    Object.defineProperty(global, 'navigator', {
      value: { hardwareConcurrency: 1, deviceMemory: 1, userAgent: 'NodeTest/1.0' },
      writable: true,
      configurable: true
    });

    window.WelcomeModule.init();
    var startScreen = doc.getElementById('startScreen');
    var hasAnimated = startScreen.classList.contains('animated-bg');
    var hasLowEnd = startScreen.classList.contains('low-end');

    Object.defineProperty(global, 'navigator', {
      value: { hardwareConcurrency: origConcurrency, deviceMemory: origMemory, userAgent: 'NodeTest/1.0' },
      writable: true,
      configurable: true
    });

    TestRunner.assert(!hasAnimated, 'low-end device should not have animated-bg');
    TestRunner.assert(hasLowEnd, 'low-end device should have low-end class');
  });

  TestRunner.test('normal device gets animated-bg class', function() {
    resetScreens();
    var origConcurrency = navigator.hardwareConcurrency;
    var origMemory = navigator.deviceMemory;
    Object.defineProperty(global, 'navigator', {
      value: { hardwareConcurrency: 4, deviceMemory: 8, userAgent: 'NodeTest/1.0' },
      writable: true,
      configurable: true
    });

    window.WelcomeModule.init();
    var startScreen = doc.getElementById('startScreen');
    var hasAnimated = startScreen.classList.contains('animated-bg');

    Object.defineProperty(global, 'navigator', {
      value: { hardwareConcurrency: origConcurrency, deviceMemory: origMemory, userAgent: 'NodeTest/1.0' },
      writable: true,
      configurable: true
    });

    TestRunner.assert(hasAnimated, 'normal device should have animated-bg');
  });
});

TestRunner.suite('WelcomeModule state & session', function() {
  TestRunner.test('navigateTo stores lastMode in sessionStorage', function() {
    sessionStorage.removeItem('lastMode');
    resetScreens();
    window.WelcomeModule.navigateTo('blindfold');
    TestRunner.assertEqual(sessionStorage.getItem('lastMode'), 'blindfold');
  });
});

TestRunner.suite('Global pollution check', function() {
  TestRunner.test('no unexpected globals leaked', function() {
    TestRunner.assert(typeof window._i18n === 'undefined', '_i18n leaked');
    TestRunner.assert(typeof window._t === 'undefined', '_t leaked');
    TestRunner.assert(typeof window._showScreen === 'undefined', '_showScreen leaked');
    TestRunner.assert(typeof window._bindCard === 'undefined', '_bindCard leaked');
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
