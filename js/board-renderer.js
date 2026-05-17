(function() {
  'use strict';

  if (typeof window === 'undefined') global.window = global;

  // ===== Node.js Minimal DOM Mock =====
  if (typeof document === 'undefined') {
    class MockElement {
      constructor(tagName) {
        this.tagName = (tagName || 'div').toUpperCase();
        this._className = '';
        this._classList = new Set();
        this.style = {};
        this._innerHTML = '';
        this.children = [];
        this._attrs = {};
        this._listeners = {};
        this.parentNode = null;
        this.id = '';
        this._textContent = '';
      }

      get classList() {
        const el = this;
        return {
          add(...cls) { cls.forEach(c => el._classList.add(c)); el._updateClassName(); },
          remove(...cls) { cls.forEach(c => el._classList.delete(c)); el._updateClassName(); },
          contains(cls) { return el._classList.has(cls); },
          toggle(cls, force) {
            const has = el._classList.has(cls);
            if (force === undefined) {
              if (has) el._classList.delete(cls); else el._classList.add(cls);
            } else if (force) el._classList.add(cls); else el._classList.delete(cls);
            el._updateClassName();
            return force !== undefined ? force : !has;
          }
        };
      }

      get className() {
        return this._className;
      }

      set className(val) {
        this._className = String(val);
        this._classList = new Set(String(val).split(/\s+/).filter(Boolean));
      }

      _updateClassName() {
        this._className = Array.from(this._classList).join(' ');
      }

      setAttribute(name, value) {
        this._attrs[name] = String(value);
        if (name === 'id') this.id = String(value);
        if (name === 'class') {
          this.className = String(value);
          this._classList = new Set(String(value).split(/\s+/).filter(Boolean));
        }
      }

      getAttribute(name) {
        if (name === 'class') return this._className || null;
        return this._attrs[name] ?? null;
      }

      removeAttribute(name) { delete this._attrs[name]; }

      appendChild(child) {
        if (child.parentNode) child.parentNode.removeChild(child);
        this.children.push(child);
        child.parentNode = this;
        return child;
      }

      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
          this.children.splice(idx, 1);
          child.parentNode = null;
        }
        return child;
      }

      remove() {
        if (this.parentNode) this.parentNode.removeChild(this);
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

      dispatchEvent(event) {
        if (!this._listeners[event.type]) return;
        this._listeners[event.type].forEach(fn => fn.call(this, event));
      }

      querySelector(selector) {
        const all = this.querySelectorAll(selector);
        return all.length > 0 ? all[0] : null;
      }

      querySelectorAll(selector) {
        const results = [];
        const parts = selector.trim().split(/\s+/);

        const matches = (el, sel) => {
          if (!el || !el.tagName) return false;
          if (sel.startsWith('.')) return el._classList.has(sel.slice(1));
          if (sel.startsWith('#')) return el.id === sel.slice(1);
          if (sel.startsWith('[')) {
            const m = sel.match(/\[([^\]=]+)(?:=["']?([^"'\]]*)["']?)?\]/);
            if (!m) return false;
            const attr = m[1];
            const val = m[2];
            if (val === undefined) return el._attrs[attr] !== undefined;
            return (el._attrs[attr] || el.getAttribute?.(attr) || '') === val;
          }
          return el.tagName === sel.toUpperCase();
        };

        const walk = (el, depth) => {
          if (depth >= parts.length) return;
          for (const child of el.children) {
            if (matches(child, parts[depth])) {
              if (depth === parts.length - 1) results.push(child);
              walk(child, depth + 1);
            } else {
              walk(child, depth);
            }
          }
        };

        walk(this, 0);
        return results;
      }

      getElementById(id) {
        if (this.id === id) return this;
        for (const child of this.children) {
          const found = child.getElementById?.(id);
          if (found) return found;
        }
        return null;
      }

      get dataset() {
        const ds = {};
        for (const [k, v] of Object.entries(this._attrs)) {
          if (k.startsWith('data-')) {
            const key = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            ds[key] = v;
          }
        }
        return ds;
      }

      set innerHTML(html) {
        for (const child of [...this.children]) {
          child.parentNode = null;
        }
        this.children = [];
        this._innerHTML = html;
      }

      get innerHTML() {
        return this._innerHTML;
      }

      get textContent() {
        return this._textContent;
      }

      set textContent(val) {
        this._textContent = String(val);
        for (const child of [...this.children]) {
          child.parentNode = null;
        }
        this.children = [];
        this._innerHTML = '';
      }

      get firstChild() {
        return this.children[0] || null;
      }

      contains(node) {
        if (node === this) return true;
        for (const child of this.children) {
          if (child.contains?.(node)) return true;
        }
        return false;
      }
    }

    class MockEvent {
      constructor(type, opts) {
        opts = opts || {};
        this.type = type;
        this.target = opts.target || null;
        this.currentTarget = opts.currentTarget || null;
      }
    }

    const byId = {};

    global.document = {
      createElement(tagName) {
        return new MockElement(tagName);
      },

      getElementById(id) {
        return byId[id] || null;
      },

      querySelector(selector) {
        for (const el of Object.values(byId)) {
          const res = el.querySelector?.(selector);
          if (res) return res;
        }
        return null;
      },

      querySelectorAll(selector) {
        const results = [];
        for (const el of Object.values(byId)) {
          const res = el.querySelectorAll?.(selector) || [];
          results.push(...res);
        }
        return results;
      },

      body: new MockElement('body'),

      _mockRegister(id, el) {
        byId[id] = el;
      },

      _mockUnregister(id) {
        delete byId[id];
      }
    };

    global.MouseEvent = class MouseEvent extends MockEvent {};
  }

  // ===== Piece SVGs (extracted from js/game.js) =====
  const pieceSvgs = {
    wk: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="M4.48 288.116v.484h-.537v.753h.537c0 .582-.142.476-.533.717-2.418-.972-3.734 2.055-.939 4.107l3.715-.014c2.848-2.038 1.504-5.064-.913-4.077-.46-.253-.545-.111-.545-.733h.548v-.753h-.548v-.484zm1.929 3.058c.644.065.894.873-.79 2.028v-1.617c.312-.315.497-.44.79-.41zm-2.962.008c.272.01.402.139.675.415v1.616c-1.683-1.154-1.433-1.962-.789-2.027a.85.85 0 0 1 .114-.004z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.37229237;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
    wq: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="M15.014 3.873a3.016 3.016 0 0 0-3.018 3.016 3.016 3.016 0 0 0 1.91 2.804l-.373 8.116-3.984-6.524a3.016 3.016 0 0 0 .53-1.709 3.016 3.016 0 0 0-3.017-3.015 3.016 3.016 0 0 0-3.015 3.015 3.016 3.016 0 0 0 2.504 2.97l4.773 14.69h15.147l4.76-14.6a3.016 3.016 0 0 0 2.595-2.982 3.016 3.016 0 0 0-3.015-3.015 3.016 3.016 0 0 0-3.016 3.015 3.016 3.016 0 0 0 .455 1.584l-4.072 6.57-.319-8.128a3.016 3.016 0 0 0 1.875-2.791 3.016 3.016 0 0 0-3.015-3.016 3.016 3.016 0 0 0-3.016 3.016 3.016 3.016 0 0 0 .854 2.103l-1.702 8.817-1.625-8.88a3.016 3.016 0 0 0 .8-2.04 3.016 3.016 0 0 0-3.016-3.016z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:1.51181102;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" transform="scale(.26458)"/></g></g></svg>`,
    wr: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="m6.74 294.177-.567-3.253H3.569l-.561 3.253z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="m6.66 289.342-.8-.222-.173.439-.328-.002v-.624l-1.002.017v.607h-.292l-.21-.436-.784.307s-.008 1.53.404 1.521h2.781c.412 0 .404-1.606.404-1.606z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
    wb: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495zm.01-.014c.202-.292 1.198-2.21-.75-4.165 0 0-.783 1.088-.913 2.696l-.477-.001c-.009-1.476 1.01-3.004 1.01-3.004.82-1.66-1.874-1.665-1.13 0-2.275 2.009-1.262 4.219-1.095 4.474z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
    wn: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.545 294.15H3.201c.046-1.268 1.457-1.942 1.521-2.553.065-.612-.223-.77-.223-.77s-.197.736-.448.886-.836.291-.836.291-.41.37-.651.344c-.242-.025-.449-.603-.449-.603l.82-1.306.417-.926.392-.428.168-.628.473.552c2.601 0 3.165 3.352 2.16 5.14zm-.003.028c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:.38604324;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
    wp: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M18.875 10.234a3.938 3.938 0 0 0-3.938 3.938 3.938 3.938 0 0 0 1.27 2.889l-2.234.959v2.33l2.643-.008c-1.555 10.05-6.007 6.96-6.007 12.527h16.657c0-5.646-4.56-2.232-6.124-12.53l2.64-.04v-2.315l-2.21-.945a3.938 3.938 0 0 0 1.242-2.867 3.938 3.938 0 0 0-3.939-3.938z" style="fill:#fff;fill-opacity:1;stroke:#000;stroke-width:1.51181102;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="scale(.26458)"/></g></g></svg>`,
    bk: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#000;fill-opacity:1;stroke:none;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="M4.48 287.937v.468h-.537v.727h.537c0 .563-.142.46-.533.694-2.418-.94-3.734 1.985-.939 3.968l3.715-.013c2.848-1.97 1.504-4.894-.913-3.94-.46-.245-.545-.107-.545-.709h.548v-.727h-.548v-.468zm1.929 2.955c.644.063.894.844-.79 1.96v-1.563c.312-.305.497-.425.79-.397m-2.962.008c.272.01.402.134.675.401v1.562c-1.683-1.115-1.433-1.897-.789-1.959a.85.85 0 0 1 .114-.004" style="fill:#000;fill-opacity:1;stroke:none;stroke-width:.36596447;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
    bq: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#000;fill-opacity:1;stroke:none;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="M3.917 287.996a.743.747 0 0 0-.743.746.743.747 0 0 0 .47.694l-.092 2.01-.982-1.615a.743.747 0 0 0 .13-.424.743.747 0 0 0-.742-.746.743.747 0 0 0-.743.746.743.747 0 0 0 .617.736l1.176 3.636h3.733l1.173-3.614a.743.747 0 0 0 .64-.738.743.747 0 0 0-.744-.747.743.747 0 0 0-.743.747.743.747 0 0 0 .112.392l-1.003 1.626-.079-2.012a.743.747 0 0 0 .462-.69.743.747 0 0 0-.743-.747.743.747 0 0 0-.743.746.743.747 0 0 0 .21.52l-.419 2.183-.4-2.198a.743.747 0 0 0 .196-.505.743.747 0 0 0-.743-.746" style="fill:#000;fill-opacity:1;stroke:none;stroke-width:.37341464;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
    br: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#000003;fill-opacity:1;stroke:none;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="m6.74 293.78-.567-2.412H3.569l-.561 2.412z" style="fill:#000003;fill-opacity:1;stroke:none;stroke-width:.33243936;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="m6.66 289.342-.8-.222-.173.439-.328-.002v-.624l-1.002.017v.607h-.292l-.21-.436-.784.307s-.008 1.53.404 1.521h2.781c.412 0 .404-1.606.404-1.606z" style="fill:#000003;fill-opacity:1;stroke:none;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
    bb: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.542 294.178c1.078 0 1.125.858 1.125 1.495H2.069c0-.65.046-1.495 1.124-1.495z" style="fill:#000002;fill-opacity:1;stroke:none;stroke-width:.38604325;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="M6.552 293.804c.202-.274 1.198-2.07-.75-3.903 0 0-.783 1.02-.913 2.526h-.477c-.009-1.383 1.01-2.815 1.01-2.815.82-1.555-1.874-1.56-1.13 0-2.275 1.882-1.262 3.953-1.095 4.192z" style="fill:#000002;fill-opacity:1;stroke:none;stroke-width:.37369174;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
    bn: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M6.5422 294.1782c1.0776 0 1.1247.8573 1.1247 1.4946H2.0688c0-.649.0465-1.4946 1.1241-1.4946z" style="fill:#000;fill-opacity:1;stroke:none;stroke-width:.38604324;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/><path d="M6.4242 293.7612H3.3096c.0424-1.2235 1.357-1.8739 1.4169-2.4641.0598-.5903-.208-.7423-.208-.7423s-.1836.7095-.4175.8545c-.234.145-.7784.2813-.7784.2813s-.382.3571-.6072.3323c-.2252-.025-.4179-.5822-.4179-.5822l.7646-1.261.3874-.894.3656-.413.1566-.6066.4401.5334c2.4231 0 2.9485 3.2354 2.0124 4.9617" style="fill:#000;fill-opacity:1;stroke:none;stroke-width:.36607537;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="matrix(1.07361 0 0 1 -.233 -286.97)"/></g></g></svg>`,
    bp: `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" class="piece-svg"><g style="fill:#fff;fill-opacity:1"><g style="fill:#fff;fill-opacity:1;stroke-width:.09651081;stroke-miterlimit:4;stroke-dasharray:none"><path d="M18.875 10.234a3.938 3.938 0 0 0-3.938 3.938 3.938 3.938 0 0 0 1.27 2.889l-2.234.959v2.33l2.643-.008c-1.555 10.05-6.007 6.96-6.007 12.527h16.657c0-5.646-4.56-2.232-6.124-12.53l2.64-.04v-2.315l-2.21-.945a3.938 3.938 0 0 0 1.242-2.867 3.938 3.938 0 0 0-3.939-3.938" style="fill:#000004;fill-opacity:1;stroke:none;stroke-width:1.51181102;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" transform="scale(.26458)"/></g></g></svg>`
  };

  // ===== FEN Parser =====
  function parseFen(fen) {
    const placement = (fen || '').split(' ')[0];
    if (!placement) return null;
    const rows = placement.split('/');
    const board = [];
    for (let i = 0; i < 8; i++) {
      const row = [];
      const chars = rows[i] || '';
      for (const ch of chars) {
        if (/\d/.test(ch)) {
          const count = parseInt(ch, 10);
          for (let j = 0; j < count; j++) row.push(null);
        } else {
          const color = ch === ch.toUpperCase() ? 'w' : 'b';
          const type = ch.toLowerCase();
          row.push({ color, type });
        }
      }
      board.push(row);
    }
    return board;
  }

  // ===== BoardRenderer =====
  window.BoardRenderer = {
    create(containerId, options) {
      options = options || {};
      const showPieces = options.showPieces !== false;
      const squareSize = options.squareSize || 40;
      const perspective = options.perspective === 'black' ? 'black' : 'white';

      // Find or create container
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
        if (document._mockRegister) document._mockRegister(containerId, container);
      }
      container.innerHTML = '';

      // Build DOM structure
      const wrapper = document.createElement('div');
      wrapper.className = 'board-renderer';
      wrapper.style.display = 'inline-block';

      const boardWrapper = document.createElement('div');
      boardWrapper.className = 'board-wrapper';
      boardWrapper.style.display = 'flex';
      boardWrapper.style.alignItems = 'flex-start';
      boardWrapper.style.gap = '4px';

      // Rank labels (1-8) on the left
      const rowLabels = document.createElement('div');
      rowLabels.className = 'board-row-labels';
      rowLabels.style.display = 'flex';
      rowLabels.style.flexDirection = 'column';

      const rankChars = perspective === 'white' ? '87654321' : '12345678';
      for (const rank of rankChars) {
        const span = document.createElement('span');
        span.textContent = rank;
        span.style.height = squareSize + 'px';
        span.style.display = 'flex';
        span.style.alignItems = 'center';
        span.style.justifyContent = 'center';
        span.style.fontSize = '0.65rem';
        span.style.fontWeight = '600';
        rowLabels.appendChild(span);
      }

      // Main area: grid + file labels
      const boardArea = document.createElement('div');
      boardArea.className = 'board-area';
      boardArea.style.display = 'flex';
      boardArea.style.flexDirection = 'column';
      boardArea.style.gap = '4px';

      // Grid
      const grid = document.createElement('div');
      grid.className = 'board-grid';
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(8, ' + squareSize + 'px)';
      grid.style.gridTemplateRows = 'repeat(8, ' + squareSize + 'px)';
      grid.style.width = (squareSize * 8 + 4) + 'px';
      grid.style.borderRadius = '12px';
      grid.style.overflow = 'hidden';
      grid.style.border = '2px solid rgba(255,255,255,0.1)';

      // File labels (a-h) at the bottom
      const colLabels = document.createElement('div');
      colLabels.className = 'board-col-labels';
      colLabels.style.display = 'flex';

      const fileChars = perspective === 'white' ? 'abcdefgh' : 'hgfedcba';
      for (const file of fileChars) {
        const span = document.createElement('span');
        span.textContent = file;
        span.style.width = squareSize + 'px';
        span.style.height = '20px';
        span.style.display = 'flex';
        span.style.alignItems = 'center';
        span.style.justifyContent = 'center';
        span.style.fontSize = '0.65rem';
        span.style.fontWeight = '600';
        colLabels.appendChild(span);
      }

      boardArea.appendChild(grid);
      boardArea.appendChild(colLabels);
      boardWrapper.appendChild(rowLabels);
      boardWrapper.appendChild(boardArea);
      wrapper.appendChild(boardWrapper);
      container.appendChild(wrapper);

      // Event delegation
      const clickCallbacks = [];

      function handleGridClick(event) {
        let target = event.target;
        while (target && target !== grid) {
          if (target.classList && target.classList.contains('square')) {
            const sq = target.getAttribute('data-square');
            if (sq) {
              clickCallbacks.forEach(cb => cb(sq));
            }
            return;
          }
          target = target.parentNode;
        }
      }

      grid.addEventListener('click', handleGridClick);

      // Instance API
      const instance = {
        render(fen) {
          grid.innerHTML = '';
          const boardArray = (fen && showPieces) ? parseFen(fen) : null;

          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              const sq = document.createElement('div');
              const isLight = (r + c) % 2 === 0;
              sq.className = 'square ' + (isLight ? 'light' : 'dark');
              sq.style.display = 'flex';
              sq.style.alignItems = 'center';
              sq.style.justifyContent = 'center';
              sq.style.width = squareSize + 'px';
              sq.style.height = squareSize + 'px';
              sq.style.fontSize = '1.6rem';
              sq.style.lineHeight = '1';
              sq.style.userSelect = 'none';
              sq.style.background = isLight ? '#eeeed2' : '#769656';

              // Compute square name from board coordinates
              const br = perspective === 'white' ? r : 7 - r;
              const bc = perspective === 'white' ? c : 7 - c;
              const file = String.fromCharCode('a'.charCodeAt(0) + bc);
              const rank = String(8 - br);
              sq.setAttribute('data-square', file + rank);

              // Place piece
              if (boardArray) {
                const piece = boardArray[br][bc];
                if (piece) {
                  sq.innerHTML = pieceSvgs[piece.color + piece.type];
                }
              }

              grid.appendChild(sq);
            }
          }
        },

        highlight(square, type) {
          const sq = grid.querySelector('[data-square="' + square + '"]');
          if (!sq) return;
          // Clear old highlight state first
          sq.classList.remove('highlight-correct', 'highlight-wrong', 'highlight-selected');
          const isLight = sq.classList.contains('light');
          sq.style.background = isLight ? '#eeeed2' : '#769656';
          sq.style.border = '';

          if (type === 'correct') {
            sq.style.background = '#34c759';
            sq.classList.add('highlight-correct');
          } else if (type === 'wrong') {
            sq.style.background = '#ff453a';
            sq.classList.add('highlight-wrong');
          } else if (type === 'selected') {
            sq.style.border = '3px solid #0a84ff';
            sq.classList.add('highlight-selected');
          }
        },

        clearHighlight() {
          const squares = grid.querySelectorAll('.square');
          squares.forEach(sq => {
            const isLight = sq.classList.contains('light');
            sq.style.background = isLight ? '#eeeed2' : '#769656';
            sq.style.border = '';
            sq.classList.remove('highlight-correct', 'highlight-wrong', 'highlight-selected');
          });
        },

        shake() {
          grid.classList.add('shake');
          setTimeout(() => {
            grid.classList.remove('shake');
          }, 500);
        },

        onSquareClick(callback) {
          if (typeof callback === 'function') {
            clickCallbacks.push(callback);
          }
        },

        destroy() {
          grid.removeEventListener('click', handleGridClick);
          clickCallbacks.length = 0;
          container.innerHTML = '';
        }
      };

      // Render empty board on creation
      instance.render();

      return instance;
    }
  };

  // ===== Node.js Self-Tests =====
  if (typeof require !== 'undefined' && require.main === module) {
    require('./test-runner.js');

    function makeContainer(id) {
      const el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
      if (document._mockRegister) document._mockRegister(id, el);
      return el;
    }

    TestRunner.suite('BoardRenderer', () => {
      // BR-01: create returns instance with required methods
      TestRunner.test('BR-01: create returns instance with all methods', () => {
        const container = makeContainer('br01');
        const board = BoardRenderer.create('br01');
        TestRunner.assert(typeof board.render === 'function', 'render missing');
        TestRunner.assert(typeof board.highlight === 'function', 'highlight missing');
        TestRunner.assert(typeof board.clearHighlight === 'function', 'clearHighlight missing');
        TestRunner.assert(typeof board.shake === 'function', 'shake missing');
        TestRunner.assert(typeof board.onSquareClick === 'function', 'onSquareClick missing');
        TestRunner.assert(typeof board.destroy === 'function', 'destroy missing');
        board.destroy();
      });

      // BR-02: 64 squares
      TestRunner.test('BR-02: 8x8 grid with 64 squares', () => {
        const container = makeContainer('br02');
        const board = BoardRenderer.create('br02');
        const grid = document.getElementById('br02').querySelector('.board-grid');
        const squares = grid.querySelectorAll('.square');
        TestRunner.assertEqual(squares.length, 64, 'Expected 64 squares');
        board.destroy();
      });

      // BR-03: colors alternate correctly
      TestRunner.test('BR-03: square colors alternate correctly', () => {
        const container = makeContainer('br03');
        const board = BoardRenderer.create('br03');
        const grid = document.getElementById('br03').querySelector('.board-grid');
        const squares = grid.querySelectorAll('.square');
        for (let i = 0; i < 8; i++) {
          for (let j = 0; j < 8; j++) {
            const idx = i * 8 + j;
            const sq = squares[idx];
            const isLight = (i + j) % 2 === 0;
            TestRunner.assert(sq.classList.contains(isLight ? 'light' : 'dark'), 'Color class wrong at ' + i + ',' + j);
            const expectedBg = isLight ? '#eeeed2' : '#769656';
            TestRunner.assertEqual(sq.style.background, expectedBg, 'Background color wrong at ' + i + ',' + j);
          }
        }
        board.destroy();
      });

      // BR-04: size adaptive
      TestRunner.test('BR-04: squareSize option applied', () => {
        const container = makeContainer('br04');
        const board = BoardRenderer.create('br04', { squareSize: 60 });
        const grid = document.getElementById('br04').querySelector('.board-grid');
        TestRunner.assert(grid.style.gridTemplateColumns.indexOf('60px') !== -1, 'gridTemplateColumns should contain 60px');
        const squares = grid.querySelectorAll('.square');
        TestRunner.assertEqual(squares[0].style.width, '60px', 'Square width should be 60px');
        TestRunner.assertEqual(squares[0].style.height, '60px', 'Square height should be 60px');
        board.destroy();
      });

      // BR-05: piece SVGs render
      TestRunner.test('BR-05: all 12 piece SVGs render correctly', () => {
        const container = makeContainer('br05');
        const board = BoardRenderer.create('br05', { showPieces: true });
        board.render('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
        const grid = document.getElementById('br05').querySelector('.board-grid');
        const squares = grid.querySelectorAll('.square');
        // a8 = black rook (index 0 in white perspective)
        TestRunner.assert(squares[0].innerHTML.includes('svg'), 'a8 should have SVG');
        TestRunner.assert(squares[0].innerHTML.includes('piece-svg'), 'a8 should have piece-svg class');
        // h1 = white rook (index 63 in white perspective)
        TestRunner.assert(squares[63].innerHTML.includes('svg'), 'h1 should have SVG');
        // a2 = white pawn
        const a2 = grid.querySelector('[data-square="a2"]');
        TestRunner.assert(a2.innerHTML.includes('svg'), 'a2 should have white pawn SVG');
        // a7 = black pawn
        const a7 = grid.querySelector('[data-square="a7"]');
        TestRunner.assert(a7.innerHTML.includes('svg'), 'a7 should have black pawn SVG');
        board.destroy();
      });

      // BR-06: FEN parsing
      TestRunner.test('BR-06: FEN string renders correct position', () => {
        const container = makeContainer('br06');
        const board = BoardRenderer.create('br06', { showPieces: true });
        board.render('8/8/8/3Q4/8/8/8/8');
        const grid = document.getElementById('br06').querySelector('.board-grid');
        const d5 = grid.querySelector('[data-square="d5"]');
        TestRunner.assert(d5.innerHTML.includes('svg'), 'd5 should have white queen SVG');
        const e4 = grid.querySelector('[data-square="e4"]');
        TestRunner.assert(!e4.innerHTML.includes('svg'), 'e4 should be empty');
        board.destroy();
      });

      // BR-07: empty board
      TestRunner.test('BR-07: empty FEN or no argument renders empty board', () => {
        const container = makeContainer('br07a');
        const board = BoardRenderer.create('br07a', { showPieces: true });
        board.render();
        const grid = document.getElementById('br07a').querySelector('.board-grid');
        const squares = grid.querySelectorAll('.square');
        let pieceCount = 0;
        squares.forEach(sq => { if (sq.innerHTML.includes('svg')) pieceCount++; });
        TestRunner.assertEqual(pieceCount, 0, 'Empty render should have 0 pieces');
        board.destroy();

        const container2 = makeContainer('br07b');
        const board2 = BoardRenderer.create('br07b', { showPieces: true });
        board2.render('');
        const grid2 = document.getElementById('br07b').querySelector('.board-grid');
        const squares2 = grid2.querySelectorAll('.square');
        pieceCount = 0;
        squares2.forEach(sq => { if (sq.innerHTML.includes('svg')) pieceCount++; });
        TestRunner.assertEqual(pieceCount, 0, 'Empty string render should have 0 pieces');
        board2.destroy();
      });

      // BR-08: pieces centered (inline styles set flex center)
      TestRunner.test('BR-08: pieces centered via flex styles', () => {
        const container = makeContainer('br08');
        const board = BoardRenderer.create('br08', { showPieces: true });
        board.render('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
        const grid = document.getElementById('br08').querySelector('.board-grid');
        const sq = grid.querySelector('[data-square="e1"]');
        TestRunner.assertEqual(sq.style.display, 'flex', 'Should use flexbox');
        TestRunner.assertEqual(sq.style.alignItems, 'center', 'Should align center');
        TestRunner.assertEqual(sq.style.justifyContent, 'center', 'Should justify center');
        board.destroy();
      });

      // BR-09: file labels a-h
      TestRunner.test('BR-09: file labels a-h at bottom', () => {
        const container = makeContainer('br09');
        const board = BoardRenderer.create('br09', { perspective: 'white' });
        const wrapper = document.getElementById('br09').querySelector('.board-wrapper');
        const colLabels = wrapper.querySelector('.board-col-labels');
        TestRunner.assert(colLabels !== null, 'Col labels should exist');
        const spans = colLabels.children;
        TestRunner.assertEqual(spans.length, 8, 'Should have 8 file labels');
        TestRunner.assertEqual(spans[0].textContent, 'a', 'First file should be a');
        TestRunner.assertEqual(spans[7].textContent, 'h', 'Last file should be h');
        board.destroy();
      });

      // BR-10: rank labels 1-8
      TestRunner.test('BR-10: rank labels 1-8 on left', () => {
        const container = makeContainer('br10');
        const board = BoardRenderer.create('br10', { perspective: 'white' });
        const wrapper = document.getElementById('br10').querySelector('.board-wrapper');
        const rowLabels = wrapper.querySelector('.board-row-labels');
        TestRunner.assert(rowLabels !== null, 'Row labels should exist');
        const spans = rowLabels.children;
        TestRunner.assertEqual(spans.length, 8, 'Should have 8 rank labels');
        TestRunner.assertEqual(spans[0].textContent, '8', 'Top rank should be 8');
        TestRunner.assertEqual(spans[7].textContent, '1', 'Bottom rank should be 1');
        board.destroy();
      });

      // BR-11/12: label styling
      TestRunner.test('BR-11/12: coordinate labels styled appropriately', () => {
        const container = makeContainer('br11');
        const board = BoardRenderer.create('br11');
        const wrapper = document.getElementById('br11').querySelector('.board-wrapper');
        const rowLabels = wrapper.querySelector('.board-row-labels');
        const colLabels = wrapper.querySelector('.board-col-labels');
        TestRunner.assertEqual(rowLabels.style.display, 'flex', 'Row labels should be flex');
        TestRunner.assertEqual(rowLabels.style.flexDirection, 'column', 'Row labels should be column');
        TestRunner.assertEqual(colLabels.style.display, 'flex', 'Col labels should be flex');
        const span = rowLabels.children[0];
        TestRunner.assertEqual(span.style.fontSize, '0.65rem', 'Font size should be 0.65rem');
        TestRunner.assertEqual(span.style.fontWeight, '600', 'Font weight should be 600');
        board.destroy();
      });

      // BR-13: white perspective a1 bottom-left
      TestRunner.test('BR-13: white perspective a1 at bottom-left', () => {
        const container = makeContainer('br13');
        const board = BoardRenderer.create('br13', { perspective: 'white' });
        const grid = document.getElementById('br13').querySelector('.board-grid');
        const squares = grid.querySelectorAll('.square');
        // DOM: row 7 is bottom, col 0 is left
        const a1 = squares[7 * 8 + 0];
        TestRunner.assertEqual(a1.getAttribute('data-square'), 'a1', 'Bottom-left should be a1');
        const h8 = squares[0 * 8 + 7];
        TestRunner.assertEqual(h8.getAttribute('data-square'), 'h8', 'Top-right should be h8');
        board.destroy();
      });

      // BR-14: black perspective a1 top-right
      TestRunner.test('BR-14: black perspective a1 at top-right', () => {
        const container = makeContainer('br14');
        const board = BoardRenderer.create('br14', { perspective: 'black' });
        const grid = document.getElementById('br14').querySelector('.board-grid');
        const squares = grid.querySelectorAll('.square');
        // DOM: row 0 is top, col 7 is right
        const a1 = squares[0 * 8 + 7];
        TestRunner.assertEqual(a1.getAttribute('data-square'), 'a1', 'Top-right should be a1');
        const h8 = squares[7 * 8 + 0];
        TestRunner.assertEqual(h8.getAttribute('data-square'), 'h8', 'Bottom-left should be h8');
        board.destroy();
      });

      // BR-15: labels reverse with perspective
      TestRunner.test('BR-15: coordinate labels reverse with perspective', () => {
        const containerW = makeContainer('br15w');
        const boardW = BoardRenderer.create('br15w', { perspective: 'white' });
        const wrapperW = document.getElementById('br15w').querySelector('.board-wrapper');
        const rowW = wrapperW.querySelector('.board-row-labels');
        const colW = wrapperW.querySelector('.board-col-labels');
        TestRunner.assertEqual(rowW.children[0].textContent, '8', 'White top rank should be 8');
        TestRunner.assertEqual(colW.children[0].textContent, 'a', 'White left file should be a');
        boardW.destroy();

        const containerB = makeContainer('br15b');
        const boardB = BoardRenderer.create('br15b', { perspective: 'black' });
        const wrapperB = document.getElementById('br15b').querySelector('.board-wrapper');
        const rowB = wrapperB.querySelector('.board-row-labels');
        const colB = wrapperB.querySelector('.board-col-labels');
        TestRunner.assertEqual(rowB.children[0].textContent, '1', 'Black top rank should be 1');
        TestRunner.assertEqual(colB.children[0].textContent, 'h', 'Black left file should be h');
        boardB.destroy();
      });

      // BR-16: options.perspective controls perspective
      TestRunner.test('BR-16: options.perspective controls perspective', () => {
        const container = makeContainer('br16');
        const board = BoardRenderer.create('br16', { perspective: 'black' });
        const grid = document.getElementById('br16').querySelector('.board-grid');
        const sq = grid.querySelector('[data-square="h1"]');
        TestRunner.assert(sq !== null, 'h1 should exist in black perspective');
        board.destroy();
      });

      // BR-17: highlight works
      TestRunner.test('BR-17: highlight applies to specified square', () => {
        const container = makeContainer('br17');
        const board = BoardRenderer.create('br17');
        board.highlight('e4', 'correct');
        const grid = document.getElementById('br17').querySelector('.board-grid');
        const sq = grid.querySelector('[data-square="e4"]');
        TestRunner.assert(sq.classList.contains('highlight-correct'), 'Should have highlight-correct class');
        board.destroy();
      });

      // BR-18: correct = green
      TestRunner.test('BR-18: correct highlight is green', () => {
        const container = makeContainer('br18');
        const board = BoardRenderer.create('br18');
        board.highlight('e4', 'correct');
        const grid = document.getElementById('br18').querySelector('.board-grid');
        const sq = grid.querySelector('[data-square="e4"]');
        TestRunner.assertEqual(sq.style.background, '#34c759', 'Correct should be green');
        board.destroy();
      });

      // BR-19: wrong = red
      TestRunner.test('BR-19: wrong highlight is red', () => {
        const container = makeContainer('br19');
        const board = BoardRenderer.create('br19');
        board.highlight('e4', 'wrong');
        const grid = document.getElementById('br19').querySelector('.board-grid');
        const sq = grid.querySelector('[data-square="e4"]');
        TestRunner.assertEqual(sq.style.background, '#ff453a', 'Wrong should be red');
        board.destroy();
      });

      // BR-20: selected = blue border
      TestRunner.test('BR-20: selected highlight has blue border', () => {
        const container = makeContainer('br20');
        const board = BoardRenderer.create('br20');
        board.highlight('e4', 'selected');
        const grid = document.getElementById('br20').querySelector('.board-grid');
        const sq = grid.querySelector('[data-square="e4"]');
        TestRunner.assertEqual(sq.style.border, '3px solid #0a84ff', 'Selected should have blue border');
        TestRunner.assert(sq.classList.contains('highlight-selected'), 'Should have highlight-selected class');
        board.destroy();
      });

      // BR-21: clearHighlight removes all
      TestRunner.test('BR-21: clearHighlight removes all highlights', () => {
        const container = makeContainer('br21');
        const board = BoardRenderer.create('br21');
        board.highlight('e4', 'correct');
        board.highlight('d5', 'wrong');
        board.highlight('f3', 'selected');
        board.clearHighlight();
        const grid = document.getElementById('br21').querySelector('.board-grid');
        const squares = grid.querySelectorAll('.square');
        squares.forEach(sq => {
          TestRunner.assert(!sq.classList.contains('highlight-correct'), 'No correct highlight');
          TestRunner.assert(!sq.classList.contains('highlight-wrong'), 'No wrong highlight');
          TestRunner.assert(!sq.classList.contains('highlight-selected'), 'No selected highlight');
        });
        board.destroy();
      });

      // BR-22: shake triggers animation class
      TestRunner.test('BR-22: shake adds shake class to grid', () => {
        const container = makeContainer('br22');
        const board = BoardRenderer.create('br22');
        const grid = document.getElementById('br22').querySelector('.board-grid');
        TestRunner.assert(!grid.classList.contains('shake'), 'Should not start with shake');
        board.shake();
        TestRunner.assert(grid.classList.contains('shake'), 'Should have shake class after call');
        board.destroy();
      });

      // BR-25: animation uses CSS class add/remove
      TestRunner.test('BR-25/26: shake uses transform-based CSS class', () => {
        const container = makeContainer('br25');
        const board = BoardRenderer.create('br25');
        const grid = document.getElementById('br25').querySelector('.board-grid');
        board.shake();
        TestRunner.assert(grid.classList.contains('shake'), 'Shake class added');
        // In real browser animation runs via CSS; in mock we verify class lifecycle
        board.destroy();
      });

      // BR-27/28/29: click event delegation
      TestRunner.test('BR-27/28/29: click event delegation returns square coordinate', () => {
        const container = makeContainer('br29');
        const board = BoardRenderer.create('br29');
        const clicked = [];
        board.onSquareClick(sq => clicked.push(sq));
        const grid = document.getElementById('br29').querySelector('.board-grid');
        const target = grid.querySelector('[data-square="e4"]');
        const event = new MouseEvent('click', { target: target });
        grid.dispatchEvent(event);
        TestRunner.assertEqual(clicked.length, 1, 'Callback should be called once');
        TestRunner.assertEqual(clicked[0], 'e4', 'Callback should receive e4');
        board.destroy();
      });

      // BR-30/31: destroy cleans up
      TestRunner.test('BR-30/31: destroy removes content and events', () => {
        const container = makeContainer('br30');
        const board = BoardRenderer.create('br30');
        board.destroy();
        const el = document.getElementById('br30');
        TestRunner.assertEqual(el.children.length, 0, 'Container should be empty after destroy');
      });

      // BR-32: 64 color alternation
      TestRunner.test('BR-32: 64 squares alternate colors in checkerboard', () => {
        const container = makeContainer('br32');
        const board = BoardRenderer.create('br32');
        const grid = document.getElementById('br32').querySelector('.board-grid');
        const squares = grid.querySelectorAll('.square');
        TestRunner.assertEqual(squares.length, 64, 'Must be 64');
        for (let i = 0; i < 8; i++) {
          for (let j = 0; j < 8; j++) {
            const idx = i * 8 + j;
            const expected = (i + j) % 2 === 0 ? 'light' : 'dark';
            TestRunner.assert(squares[idx].classList.contains(expected), 'Checkerboard pattern at ' + i + ',' + j);
          }
        }
        board.destroy();
      });

      // BR-33: all 12 SVG piece types
      TestRunner.test('BR-33: all 12 piece SVGs present', () => {
        const types = ['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'];
        types.forEach(t => {
          TestRunner.assert(pieceSvgs[t] !== undefined, 'Missing SVG for ' + t);
          TestRunner.assert(pieceSvgs[t].includes('svg'), 'Invalid SVG for ' + t);
        });
      });

      // BR-34: perspective reversal with pieces
      TestRunner.test('BR-34: black perspective reverses piece layout', () => {
        const containerW = makeContainer('br34w');
        const boardW = BoardRenderer.create('br34w', { perspective: 'white', showPieces: true });
        boardW.render('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
        const gridW = document.getElementById('br34w').querySelector('.board-grid');
        // White perspective: a1 (index 56) should have white rook
        const a1w = gridW.querySelector('[data-square="a1"]');
        TestRunner.assert(a1w.innerHTML.includes('svg'), 'White a1 should have piece');
        boardW.destroy();

        const containerB = makeContainer('br34b');
        const boardB = BoardRenderer.create('br34b', { perspective: 'black', showPieces: true });
        boardB.render('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
        const gridB = document.getElementById('br34b').querySelector('.board-grid');
        // Black perspective: a1 (index 7) should have white rook
        const a1b = gridB.querySelector('[data-square="a1"]');
        TestRunner.assert(a1b.innerHTML.includes('svg'), 'Black a1 should have piece');
        boardB.destroy();
      });

      // BR-35: highlight classes add/remove
      TestRunner.test('BR-35: highlight classes correctly added and removed', () => {
        const container = makeContainer('br35');
        const board = BoardRenderer.create('br35');
        board.highlight('e4', 'correct');
        const grid = document.getElementById('br35').querySelector('.board-grid');
        const sq = grid.querySelector('[data-square="e4"]');
        TestRunner.assert(sq.classList.contains('highlight-correct'), 'correct class');
        board.highlight('e4', 'wrong');
        TestRunner.assert(!sq.classList.contains('highlight-correct'), 'old class removed');
        TestRunner.assert(sq.classList.contains('highlight-wrong'), 'wrong class');
        board.clearHighlight();
        TestRunner.assert(!sq.classList.contains('highlight-wrong'), 'cleared');
        board.destroy();
      });
    });

    TestRunner.run().then(r => {
      if (r.failed > 0) {
        console.error('BoardRenderer self-test failed');
        if (typeof process !== 'undefined') process.exit(1);
      }
    });
  }
})();
