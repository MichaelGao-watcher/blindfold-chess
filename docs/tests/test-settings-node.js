/**
 * Node.js test runner for SettingsModule.
 * Provides a minimal DOM mock so that settings.js can load and run
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
    this.classList = new MockClassList();
    this.style = {};
    this.children = [];
    this._parent = null;
    this._attrs = new Map();
    this._textContent = '';
    this._listeners = {};
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
const _docListeners = {};
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
    const fromBody = walk(body);
    if (fromBody) return fromBody;
    if (docEl.id === id) return docEl;
    return null;
  },

  querySelectorAll(sel) {
    const results = [];
    const walk = (el) => {
      for (const child of el.children) {
        if (sel.startsWith('[')) {
          const m = sel.match(/\[([^\]=]+)(?:=["']?([^"'\]]*)["']?)?\]/);
          if (m) {
            const attr = m[1];
            let val = m[2];
            if (val && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (val === undefined ? child.getAttribute(attr) !== null : child.getAttribute(attr) === val) {
              results.push(child);
            }
          }
        }
        walk(child);
      }
    };
    walk(body);
    return results;
  },

  addEventListener(type, fn) {
    if (!_docListeners[type]) _docListeners[type] = [];
    _docListeners[type].push(fn);
  },

  removeEventListener(type, fn) {
    if (!_docListeners[type]) return;
    const idx = _docListeners[type].indexOf(fn);
    if (idx !== -1) _docListeners[type].splice(idx, 1);
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
//  Build minimal DOM tree matching index.html settings panel
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

// Settings toggle button
const settingsToggle = makeEl('button', { id: 'settingsToggle', className: 'settings-toggle', parent: body });

// Settings panel
const settingsPanel = makeEl('div', { id: 'settingsPanel', className: 'settings-panel', parent: body });

// Theme setting
const themeSetting = makeEl('div', { id: 'themeSetting', className: 'settings-item', parent: settingsPanel });
makeEl('span', { className: 'settings-label', attr: { 'data-i18n': 'themeLabel' }, text: 'Theme', parent: themeSetting });
const themeValue = makeEl('span', { id: 'themeValue', className: 'settings-value', parent: themeSetting });
makeEl('svg', { id: 'panelIconSun', parent: themeValue });
makeEl('svg', { id: 'panelIconMoon', parent: themeValue });

// Language setting
const langSetting = makeEl('div', { id: 'langSetting', className: 'settings-item', parent: settingsPanel });
makeEl('span', { className: 'settings-label', attr: { 'data-i18n': 'langLabel' }, text: 'Language', parent: langSetting });
makeEl('span', { id: 'langValue', className: 'settings-value', text: '中文', parent: langSetting });

// Sound setting
const soundSetting = makeEl('div', { id: 'soundSetting', className: 'settings-item', parent: settingsPanel });
makeEl('span', { className: 'settings-label', attr: { 'data-i18n': 'soundLabel' }, text: '音效', parent: soundSetting });
makeEl('span', { id: 'soundValue', className: 'settings-value', text: '开', parent: soundSetting });

// Engine group
const engineGroup = makeEl('div', { className: 'settings-group', parent: settingsPanel });
makeEl('div', { className: 'settings-group-title', attr: { 'data-i18n': 'engineConfig' }, text: '引擎', parent: engineGroup });

// Elo slider
const eloSetting = makeEl('div', { id: 'eloSetting', className: 'settings-item slider-item', parent: engineGroup });
const eloLabelRow = makeEl('div', { className: 'slider-label-row', parent: eloSetting });
makeEl('span', { className: 'settings-label', attr: { 'data-i18n': 'eloLabel' }, text: '等级分', parent: eloLabelRow });
makeEl('span', { id: 'eloValue', className: 'slider-value', text: '1200', parent: eloLabelRow });
makeEl('input', { id: 'eloSlider', attr: { type: 'range', min: '400', max: '3200', step: '50', value: '1200' }, parent: eloSetting });

// Depth slider
const depthSetting = makeEl('div', { id: 'depthSetting', className: 'settings-item slider-item', parent: engineGroup });
const depthLabelRow = makeEl('div', { className: 'slider-label-row', parent: depthSetting });
makeEl('span', { className: 'settings-label', attr: { 'data-i18n': 'depthLabel' }, text: '深度', parent: depthLabelRow });
makeEl('span', { id: 'depthValue', className: 'slider-value', text: '15', parent: depthLabelRow });
makeEl('input', { id: 'depthSlider', attr: { type: 'range', min: '1', max: '30', step: '1', value: '15' }, parent: depthSetting });

// MultiPV toggle
const multiPvSetting = makeEl('div', { id: 'multiPvSetting', className: 'settings-item', parent: engineGroup });
makeEl('span', { className: 'settings-label', attr: { 'data-i18n': 'multiPvLabel' }, text: '多线分析', parent: multiPvSetting });
makeEl('span', { id: 'multiPvValue', className: 'settings-value', text: '关', parent: multiPvSetting });

// Show hints toggle
const showHintsSetting = makeEl('div', { id: 'showHintsSetting', className: 'settings-item', parent: engineGroup });
makeEl('span', { className: 'settings-label', attr: { 'data-i18n': 'showHintsLabel' }, text: '走法建议', parent: showHintsSetting });
makeEl('span', { id: 'showHintsValue', className: 'settings-value', text: '关', parent: showHintsSetting });

// Some data-i18n elements for global text update tests
const testTitle = makeEl('h1', { attr: { 'data-i18n': 'tagline' }, text: 'Play chess without seeing the board.', parent: body });

// =====================================================================
//  Load dependencies
// =====================================================================

require('../../js/test-runner.js');
require('../../js/storage.js');
require('../../js/settings.js');

// =====================================================================
//  Helper utilities
// =====================================================================

function resetStorage() {
  localStorage.clear();
}

function clickElement(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error('Element not found: ' + id);
  const ev = new Event('click', { bubbles: true });
  el.dispatchEvent(ev);
}

function dispatchInput(id, value) {
  const el = document.getElementById(id);
  if (!el) throw new Error('Element not found: ' + id);
  // Mock input event with target.value
  const ev = new Event('input', { bubbles: true });
  // Add value getter to event target
  Object.defineProperty(ev, 'target', {
    value: { value: String(value) },
    writable: true,
    configurable: true
  });
  el.dispatchEvent(ev);
}

function getText(id) {
  const el = document.getElementById(id);
  return el ? el.textContent : null;
}

function getAttr(id, attr) {
  const el = document.getElementById(id);
  return el ? el.getAttribute(attr) : null;
}

function getClassList(id) {
  const el = document.getElementById(id);
  return el ? Array.from(el.classList._set) : [];
}

// =====================================================================
//  Test suites
// =====================================================================

TestRunner.suite('SettingsModule API', function() {
  TestRunner.test('SettingsModule exposed on window', function() {
    TestRunner.assert(typeof window.SettingsModule === 'object', 'SettingsModule not exposed');
  });

  TestRunner.test('init is a function', function() {
    TestRunner.assert(typeof window.SettingsModule.init === 'function', 'init not a function');
  });

  TestRunner.test('setTheme is a function', function() {
    TestRunner.assert(typeof window.SettingsModule.setTheme === 'function', 'setTheme not a function');
  });

  TestRunner.test('setLanguage is a function', function() {
    TestRunner.assert(typeof window.SettingsModule.setLanguage === 'function', 'setLanguage not a function');
  });

  TestRunner.test('setSound is a function', function() {
    TestRunner.assert(typeof window.SettingsModule.setSound === 'function', 'setSound not a function');
  });

  TestRunner.test('setEngineConfig is a function', function() {
    TestRunner.assert(typeof window.SettingsModule.setEngineConfig === 'function', 'setEngineConfig not a function');
  });

  TestRunner.test('get is a function', function() {
    TestRunner.assert(typeof window.SettingsModule.get === 'function', 'get not a function');
  });
});

TestRunner.suite('SettingsModule.init defaults', function() {
  TestRunner.test('init applies default theme dark', function() {
    resetStorage();
    window.SettingsModule.init();
    TestRunner.assertEqual(getAttr('testTitle', 'data-theme') || document.documentElement.getAttribute('data-theme'), 'dark');
  });

  TestRunner.test('init applies default lang zh', function() {
    resetStorage();
    window.SettingsModule.init();
    TestRunner.assertEqual(document.documentElement.lang, 'zh-CN');
  });

  TestRunner.test('get returns default values', function() {
    resetStorage();
    window.SettingsModule.init();
    TestRunner.assertEqual(SettingsModule.get('theme'), 'dark');
    TestRunner.assertEqual(SettingsModule.get('lang'), 'zh');
    TestRunner.assertEqual(SettingsModule.get('sound'), true);
    TestRunner.assertEqual(SettingsModule.get('showHints'), false);
    const engine = SettingsModule.get('engineConfig');
    TestRunner.assertEqual(engine.elo, 1200);
    TestRunner.assertEqual(engine.depth, 15);
    TestRunner.assertEqual(engine.multiPv, false);
  });
});

TestRunner.suite('SettingsModule.setTheme', function() {
  TestRunner.test('setTheme switches to light', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setTheme('light');
    TestRunner.assertEqual(document.documentElement.getAttribute('data-theme'), 'light');
    TestRunner.assertEqual(SettingsModule.get('theme'), 'light');
  });

  TestRunner.test('setTheme switches back to dark', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setTheme('light');
    window.SettingsModule.setTheme('dark');
    TestRunner.assertEqual(document.documentElement.getAttribute('data-theme'), 'dark');
    TestRunner.assertEqual(SettingsModule.get('theme'), 'dark');
  });

  TestRunner.test('setTheme ignores invalid value', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setTheme('blue');
    TestRunner.assertEqual(SettingsModule.get('theme'), 'dark');
  });

  TestRunner.test('theme persists to StorageModule', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setTheme('light');
    const stored = StorageModule.get('theme');
    TestRunner.assertEqual(stored, 'light');
  });

  TestRunner.test('theme click toggles theme', function() {
    resetStorage();
    window.SettingsModule.init();
    clickElement('themeSetting');
    TestRunner.assertEqual(SettingsModule.get('theme'), 'light');
    clickElement('themeSetting');
    TestRunner.assertEqual(SettingsModule.get('theme'), 'dark');
  });
});

TestRunner.suite('SettingsModule.setLanguage', function() {
  TestRunner.test('setLanguage switches to en', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setLanguage('en');
    TestRunner.assertEqual(document.documentElement.lang, 'en');
    TestRunner.assertEqual(SettingsModule.get('lang'), 'en');
  });

  TestRunner.test('setLanguage switches back to zh', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setLanguage('en');
    window.SettingsModule.setLanguage('zh');
    TestRunner.assertEqual(document.documentElement.lang, 'zh-CN');
    TestRunner.assertEqual(SettingsModule.get('lang'), 'zh');
  });

  TestRunner.test('setLanguage ignores invalid value', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setLanguage('fr');
    TestRunner.assertEqual(SettingsModule.get('lang'), 'zh');
  });

  TestRunner.test('language persists to StorageModule', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setLanguage('en');
    const stored = StorageModule.get('lang');
    TestRunner.assertEqual(stored, 'en');
  });

  TestRunner.test('language click toggles language', function() {
    resetStorage();
    window.SettingsModule.init();
    clickElement('langSetting');
    TestRunner.assertEqual(SettingsModule.get('lang'), 'en');
    clickElement('langSetting');
    TestRunner.assertEqual(SettingsModule.get('lang'), 'zh');
  });

  TestRunner.test('language switch updates langValue text', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setLanguage('en');
    TestRunner.assertEqual(getText('langValue'), 'English');
    window.SettingsModule.setLanguage('zh');
    TestRunner.assertEqual(getText('langValue'), '中文');
  });
});

TestRunner.suite('SettingsModule.setSound', function() {
  TestRunner.test('setSound false updates setting', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setSound(false);
    TestRunner.assertEqual(SettingsModule.get('sound'), false);
  });

  TestRunner.test('setSound true updates setting', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setSound(false);
    window.SettingsModule.setSound(true);
    TestRunner.assertEqual(SettingsModule.get('sound'), true);
  });

  TestRunner.test('sound persists to StorageModule', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setSound(false);
    TestRunner.assertEqual(StorageModule.get('sound'), false);
  });

  TestRunner.test('sound click toggles sound', function() {
    resetStorage();
    window.SettingsModule.init();
    clickElement('soundSetting');
    TestRunner.assertEqual(SettingsModule.get('sound'), false);
    clickElement('soundSetting');
    TestRunner.assertEqual(SettingsModule.get('sound'), true);
  });
});

TestRunner.suite('SettingsModule.setEngineConfig', function() {
  TestRunner.test('setEngineConfig updates elo', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setEngineConfig({ elo: 2000 });
    TestRunner.assertEqual(SettingsModule.get('engineConfig').elo, 2000);
  });

  TestRunner.test('elo is clamped to minimum 400', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setEngineConfig({ elo: 100 });
    TestRunner.assertEqual(SettingsModule.get('engineConfig').elo, 400);
  });

  TestRunner.test('elo is clamped to maximum 3200', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setEngineConfig({ elo: 5000 });
    TestRunner.assertEqual(SettingsModule.get('engineConfig').elo, 3200);
  });

  TestRunner.test('setEngineConfig updates depth', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setEngineConfig({ depth: 20 });
    TestRunner.assertEqual(SettingsModule.get('engineConfig').depth, 20);
  });

  TestRunner.test('depth is clamped to minimum 1', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setEngineConfig({ depth: 0 });
    TestRunner.assertEqual(SettingsModule.get('engineConfig').depth, 1);
  });

  TestRunner.test('depth is clamped to maximum 30', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setEngineConfig({ depth: 99 });
    TestRunner.assertEqual(SettingsModule.get('engineConfig').depth, 30);
  });

  TestRunner.test('setEngineConfig updates multiPv', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setEngineConfig({ multiPv: true });
    TestRunner.assertEqual(SettingsModule.get('engineConfig').multiPv, true);
  });

  TestRunner.test('engine config persists to StorageModule', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setEngineConfig({ elo: 2400, depth: 20, multiPv: true });
    const stored = StorageModule.get('engineConfig');
    TestRunner.assertEqual(stored.elo, 2400);
    TestRunner.assertEqual(stored.depth, 20);
    TestRunner.assertEqual(stored.multiPv, true);
  });

  TestRunner.test('elo slider input updates config', function() {
    resetStorage();
    window.SettingsModule.init();
    dispatchInput('eloSlider', '1800');
    TestRunner.assertEqual(SettingsModule.get('engineConfig').elo, 1800);
  });

  TestRunner.test('depth slider input updates config', function() {
    resetStorage();
    window.SettingsModule.init();
    dispatchInput('depthSlider', '10');
    TestRunner.assertEqual(SettingsModule.get('engineConfig').depth, 10);
  });

  TestRunner.test('multiPv click toggles multiPv', function() {
    resetStorage();
    window.SettingsModule.init();
    clickElement('multiPvSetting');
    TestRunner.assertEqual(SettingsModule.get('engineConfig').multiPv, true);
    clickElement('multiPvSetting');
    TestRunner.assertEqual(SettingsModule.get('engineConfig').multiPv, false);
  });
});

TestRunner.suite('SettingsModule.showHints', function() {
  TestRunner.test('showHints click toggles value', function() {
    resetStorage();
    window.SettingsModule.init();
    clickElement('showHintsSetting');
    TestRunner.assertEqual(SettingsModule.get('showHints'), true);
    clickElement('showHintsSetting');
    TestRunner.assertEqual(SettingsModule.get('showHints'), false);
  });

  TestRunner.test('showHints persists to StorageModule', function() {
    resetStorage();
    window.SettingsModule.init();
    clickElement('showHintsSetting');
    TestRunner.assertEqual(StorageModule.get('showHints'), true);
  });
});

TestRunner.suite('SettingsModule persistence across init', function() {
  TestRunner.test('theme survives reload', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setTheme('light');
    // Simulate reload by re-initializing
    window.SettingsModule.init();
    TestRunner.assertEqual(SettingsModule.get('theme'), 'light');
    TestRunner.assertEqual(document.documentElement.getAttribute('data-theme'), 'light');
  });

  TestRunner.test('lang survives reload', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setLanguage('en');
    window.SettingsModule.init();
    TestRunner.assertEqual(SettingsModule.get('lang'), 'en');
  });

  TestRunner.test('sound survives reload', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setSound(false);
    window.SettingsModule.init();
    TestRunner.assertEqual(SettingsModule.get('sound'), false);
  });

  TestRunner.test('engineConfig survives reload', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setEngineConfig({ elo: 2500, depth: 25, multiPv: true });
    window.SettingsModule.init();
    const cfg = SettingsModule.get('engineConfig');
    TestRunner.assertEqual(cfg.elo, 2500);
    TestRunner.assertEqual(cfg.depth, 25);
    TestRunner.assertEqual(cfg.multiPv, true);
  });
});

TestRunner.suite('SettingsModule panel toggle', function() {
  TestRunner.test('panel starts hidden', function() {
    resetStorage();
    window.SettingsModule.init();
    const panel = document.getElementById('settingsPanel');
    TestRunner.assert(!panel.classList.contains('show'), 'panel should not have show class initially');
  });

  TestRunner.test('toggle click opens panel', function() {
    resetStorage();
    window.SettingsModule.init();
    clickElement('settingsToggle');
    const panel = document.getElementById('settingsPanel');
    TestRunner.assert(panel.classList.contains('show'), 'panel should have show class after toggle');
  });

  TestRunner.test('toggle click again closes panel', function() {
    resetStorage();
    window.SettingsModule.init();
    clickElement('settingsToggle');
    clickElement('settingsToggle');
    const panel = document.getElementById('settingsPanel');
    TestRunner.assert(!panel.classList.contains('show'), 'panel should not have show class after second toggle');
  });

  TestRunner.test('click outside closes panel', function() {
    resetStorage();
    window.SettingsModule.init();
    clickElement('settingsToggle');
    const panel = document.getElementById('settingsPanel');
    TestRunner.assert(panel.classList.contains('show'), 'panel should be open');

    // Simulate document click
    const outsideClick = new Event('click', { bubbles: true });
    Object.defineProperty(outsideClick, 'target', {
      value: document.body,
      writable: true,
      configurable: true
    });
    const listeners = _docListeners['click'] || [];
    for (const fn of listeners) fn(outsideClick);

    TestRunner.assert(!panel.classList.contains('show'), 'panel should close on outside click');
  });
});

TestRunner.suite('SettingsModule UI sync', function() {
  TestRunner.test('theme change updates icon visibility', function() {
    resetStorage();
    window.SettingsModule.init();
    const sun = document.getElementById('panelIconSun');
    const moon = document.getElementById('panelIconMoon');
    TestRunner.assertEqual(sun.style.display, 'none');
    TestRunner.assertEqual(moon.style.display, 'block');

    window.SettingsModule.setTheme('light');
    TestRunner.assertEqual(sun.style.display, 'block');
    TestRunner.assertEqual(moon.style.display, 'none');
  });

  TestRunner.test('elo change updates eloValue text', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setEngineConfig({ elo: 2000 });
    TestRunner.assertEqual(getText('eloValue'), '2000');
  });

  TestRunner.test('depth change updates depthValue text', function() {
    resetStorage();
    window.SettingsModule.init();
    window.SettingsModule.setEngineConfig({ depth: 8 });
    TestRunner.assertEqual(getText('depthValue'), '8');
  });
});

TestRunner.suite('SettingsModule change callbacks', function() {
  TestRunner.test('_onChange receives events', function() {
    resetStorage();
    window.SettingsModule.init();
    var received = [];
    window.SettingsModule._onChange(function(key, value) {
      received.push({ key: key, value: value });
    });
    window.SettingsModule.setTheme('light');
    TestRunner.assertEqual(received.length, 1);
    TestRunner.assertEqual(received[0].key, 'theme');
    TestRunner.assertEqual(received[0].value, 'light');
  });
});

TestRunner.suite('Global pollution check', function() {
  TestRunner.test('no unexpected globals leaked', function() {
    TestRunner.assert(typeof window._defaults === 'undefined', '_defaults leaked');
    TestRunner.assert(typeof window._settings === 'undefined', '_settings leaked');
    TestRunner.assert(typeof window._i18n === 'undefined', '_i18n leaked');
    TestRunner.assert(typeof window._t === 'undefined', '_t leaked');
    TestRunner.assert(typeof window._load === 'undefined', '_load leaked');
    TestRunner.assert(typeof window._save === 'undefined', '_save leaked');
    TestRunner.assert(typeof window._rebind === 'undefined', '_rebind leaked');
    TestRunner.assert(typeof window._updateThemeIcon === 'undefined', '_updateThemeIcon leaked');
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
