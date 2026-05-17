if (typeof window === 'undefined') global.window = global;

(function() {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Node.js / CLI polyfills                                           */
  /* ------------------------------------------------------------------ */

  // localStorage
  if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') {
    const _store = new Map();
    global.localStorage = {
      getItem(k) { return _store.has(k) ? _store.get(k) : null; },
      setItem(k, v) { _store.set(k, String(v)); },
      removeItem(k) { _store.delete(k); },
      clear() { _store.clear(); },
      get length() { return _store.size; },
      key(i) { return Array.from(_store.keys())[i] || null; }
    };
  }

  // IndexedDB (in-memory mock)
  if (typeof indexedDB === 'undefined') {
    const _dbs = new Map();

    function _fire(req, result, eventName) {
      eventName = eventName || 'onsuccess';
      setTimeout(() => {
        req.result = result;
        req.readyState = 'done';
        if (req[eventName]) req[eventName]({ target: req });
      }, 0);
    }

    function _createStore(name, options) {
      const keyPath = options ? options.keyPath : undefined;
      const _data = new Map();
      const _indexes = new Map();

      const store = {
        name: name,
        keyPath: keyPath,
        createIndex: function(idxName, idxKeyPath, idxOpts) {
          _indexes.set(idxName, { keyPath: idxKeyPath, unique: !!(idxOpts && idxOpts.unique) });
        },
        put: function(value) {
          const key = keyPath ? value[keyPath] : value;
          _data.set(key, JSON.parse(JSON.stringify(value)));
          const req = { result: null, error: null, source: store, readyState: 'pending', onsuccess: null, onerror: null };
          _fire(req, key);
          return req;
        },
        get: function(key) {
          const req = { result: null, error: null, source: store, readyState: 'pending', onsuccess: null, onerror: null };
          _fire(req, _data.get(key));
          return req;
        },
        getAll: function() {
          const req = { result: null, error: null, source: store, readyState: 'pending', onsuccess: null, onerror: null };
          _fire(req, Array.from(_data.values()));
          return req;
        },
        delete: function(key) {
          _data.delete(key);
          const req = { result: null, error: null, source: store, readyState: 'pending', onsuccess: null, onerror: null };
          _fire(req, undefined);
          return req;
        },
        clear: function() {
          _data.clear();
          const req = { result: null, error: null, source: store, readyState: 'pending', onsuccess: null, onerror: null };
          _fire(req, undefined);
          return req;
        },
        index: function(idxName) {
          return {
            getAll: function() {
              const req = { result: null, error: null, source: store, readyState: 'pending', onsuccess: null, onerror: null };
              _fire(req, Array.from(_data.values()));
              return req;
            },
            openCursor: function() {
              const values = Array.from(_data.values());
              let pos = 0;
              const req = { result: null, error: null, source: store, readyState: 'pending', onsuccess: null, onerror: null };
              setTimeout(() => {
                if (pos < values.length) {
                  req.result = {
                    value: values[pos],
                    key: keyPath ? values[pos][keyPath] : values[pos],
                    continue: function() {
                      pos++;
                      if (pos < values.length) {
                        this.value = values[pos];
                        this.key = keyPath ? values[pos][keyPath] : values[pos];
                        _fire(req, this);
                      } else {
                        req.result = null;
                        _fire(req, null);
                      }
                    }
                  };
                } else {
                  req.result = null;
                }
                req.readyState = 'done';
                if (req.onsuccess) req.onsuccess({ target: req });
              }, 0);
              return req;
            }
          };
        },
        openCursor: function() {
          const values = Array.from(_data.values());
          let pos = 0;
          const req = { result: null, error: null, source: store, readyState: 'pending', onsuccess: null, onerror: null };
          setTimeout(() => {
            if (pos < values.length) {
              req.result = {
                value: values[pos],
                key: keyPath ? values[pos][keyPath] : values[pos],
                continue: function() {
                  pos++;
                  if (pos < values.length) {
                    this.value = values[pos];
                    this.key = keyPath ? values[pos][keyPath] : values[pos];
                    _fire(req, this);
                  } else {
                    req.result = null;
                    _fire(req, null);
                  }
                }
              };
            } else {
              req.result = null;
            }
            req.readyState = 'done';
            if (req.onsuccess) req.onsuccess({ target: req });
          }, 0);
          return req;
        }
      };
      return store;
    }

    const indexedDB = {
      open: function(name, version) {
        const req = { result: null, error: null, source: null, readyState: 'pending', onsuccess: null, onerror: null, onupgradeneeded: null };
        setTimeout(() => {
          let db = _dbs.get(name);
          const oldVersion = db ? db.version : 0;
          const needsUpgrade = !db || oldVersion < version;

          if (!db) {
            const _stores = new Map();
            db = {
              name: name,
              version: version,
              _stores: _stores,
              objectStoreNames: {
                contains: function(n) { return _stores.has(n); }
              },
              createObjectStore: function(storeName, options) {
                const store = _createStore(storeName, options);
                _stores.set(storeName, store);
                return store;
              },
              transaction: function(storeNames, mode) {
                const names = Array.isArray(storeNames) ? storeNames : [storeNames];
                return {
                  objectStore: function(n) { return db._stores.get(n); }
                };
              }
            };
            _dbs.set(name, db);
          } else if (oldVersion < version) {
            db.version = version;
          }

          if (needsUpgrade && req.onupgradeneeded) {
            req.result = db;
            req.onupgradeneeded({ target: req, oldVersion: oldVersion, newVersion: version });
          }

          req.result = db;
          req.readyState = 'done';
          if (req.onsuccess) req.onsuccess({ target: req });
        }, 0);
        return req;
      },
      deleteDatabase: function(name) {
        _dbs.delete(name);
        const req = { result: null, error: null, source: null, readyState: 'pending', onsuccess: null, onerror: null };
        _fire(req, undefined);
        return req;
      }
    };

    global.indexedDB = indexedDB;
  }

  // Blob / URL / document polyfills for downloadPgn in Node
  if (typeof Blob === 'undefined') {
    global.Blob = class Blob {
      constructor(parts, options) {
        this._parts = parts || [];
        this.type = (options && options.type) ? options.type : '';
      }
    };
  }
  if (typeof URL === 'undefined' || !URL.createObjectURL) {
    const _URL = global.URL || class URL {};
    _URL.createObjectURL = function(blob) { return 'blob:mock/' + Math.random().toString(36).slice(2); };
    _URL.revokeObjectURL = function() {};
    global.URL = _URL;
  }
  if (typeof document === 'undefined') {
    global.document = {
      getElementById: function() { return null; },
      createElement: function(tag) {
        return { href: '', download: '', click: function() {}, style: {}, textContent: '' };
      },
      body: {
        appendChild: function() {},
        removeChild: function() {}
      }
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Module internals                                                  */
  /* ------------------------------------------------------------------ */

  let _db = null;
  let _dbName = 'BlindfoldChessDB';
  let _dbVersion = 1;
  let _prefix = 'blindfold_chess_';

  function _uuid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  function _wait(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() { resolve(request.result); };
      request.onerror = function() { reject(request.error || new Error('IndexedDB request failed')); };
    });
  }

  function _fullKey(key) {
    return _prefix + key;
  }

  /* ------------------------------------------------------------------ */
  /*  StorageModule                                                     */
  /* ------------------------------------------------------------------ */

  const StorageModule = {

    init: function() {
      if (_db) return Promise.resolve();
      return new Promise(function(resolve, reject) {
        const request = indexedDB.open(_dbName, _dbVersion);
        request.onupgradeneeded = function(event) {
          const db = event.target.result;

          if (!db.objectStoreNames.contains('gameRecords')) {
            const store = db.createObjectStore('gameRecords', { keyPath: 'id' });
            store.createIndex('date', 'date', { unique: false });
            store.createIndex('difficulty', 'difficulty', { unique: false });
            store.createIndex('result', 'result', { unique: false });
          }

          if (!db.objectStoreNames.contains('stats')) {
            const store = db.createObjectStore('stats', { keyPath: 'id' });
            store.createIndex('date', 'date', { unique: false });
            store.createIndex('type', 'type', { unique: false });
          }

          if (!db.objectStoreNames.contains('coordinateRecords')) {
            const store = db.createObjectStore('coordinateRecords', { keyPath: 'id' });
            store.createIndex('date', 'date', { unique: false });
          }
        };
        request.onsuccess = function(event) {
          _db = event.target.result;
          resolve();
        };
        request.onerror = function() {
          reject(request.error || new Error('Failed to open IndexedDB'));
        };
      });
    },

    set: function(key, val) {
      try {
        localStorage.setItem(_fullKey(key), JSON.stringify(val));
      } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
          throw new Error('LocalStorage quota exceeded');
        }
        throw e;
      }
    },

    get: function(key) {
      try {
        const raw = localStorage.getItem(_fullKey(key));
        if (raw === null) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },

    remove: function(key) {
      localStorage.removeItem(_fullKey(key));
    },

    addGameRecord: function(record) {
      if (!record || typeof record !== 'object') {
        throw new Error('Invalid game record');
      }
      if (!record.id) record.id = _uuid();
      if (!record.date) record.date = new Date().toISOString();
      if (!record.mode) record.mode = 'blindfold';

      const tx = _db.transaction(['gameRecords'], 'readwrite');
      const store = tx.objectStore('gameRecords');
      return _wait(store.put(record));
    },

    getGameRecords: function(filter) {
      filter = filter || {};
      const tx = _db.transaction(['gameRecords'], 'readonly');
      const store = tx.objectStore('gameRecords');
      return _wait(store.getAll()).then(function(records) {
        if (filter.difficulty) {
          records = records.filter(function(r) { return r.difficulty === filter.difficulty; });
        }
        if (filter.result) {
          records = records.filter(function(r) { return r.result === filter.result; });
        }
        if (filter.startDate) {
          records = records.filter(function(r) { return r.date >= filter.startDate; });
        }
        if (filter.endDate) {
          records = records.filter(function(r) { return r.date <= filter.endDate; });
        }
        return records;
      });
    },

    getGameRecordById: function(id) {
      const tx = _db.transaction(['gameRecords'], 'readonly');
      const store = tx.objectStore('gameRecords');
      return _wait(store.get(id));
    },

    deleteGameRecord: function(id) {
      const tx = _db.transaction(['gameRecords'], 'readwrite');
      const store = tx.objectStore('gameRecords');
      return _wait(store.delete(id));
    },

    addStat: function(entry) {
      if (!entry || typeof entry !== 'object') {
        throw new Error('Invalid stat entry');
      }
      if (!entry.id) entry.id = _uuid();
      if (!entry.date) entry.date = new Date().toISOString();

      const tx = _db.transaction(['stats'], 'readwrite');
      const store = tx.objectStore('stats');
      return _wait(store.put(entry));
    },

    getStats: function(type) {
      const tx = _db.transaction(['stats'], 'readonly');
      const store = tx.objectStore('stats');
      return _wait(store.getAll()).then(function(records) {
        if (type) {
          records = records.filter(function(r) { return r.type === type; });
        }
        return records;
      });
    },

    getStatsByDateRange: function(start, end) {
      const tx = _db.transaction(['stats'], 'readonly');
      const store = tx.objectStore('stats');
      return _wait(store.getAll()).then(function(records) {
        return records.filter(function(r) {
          return r.date >= start && r.date <= end;
        });
      });
    },

    addCoordinateRecord: function(record) {
      if (!record || typeof record !== 'object') {
        throw new Error('Invalid coordinate record');
      }
      if (!record.id) record.id = _uuid();
      if (!record.date) record.date = new Date().toISOString();

      const tx = _db.transaction(['coordinateRecords'], 'readwrite');
      const store = tx.objectStore('coordinateRecords');
      return _wait(store.put(record));
    },

    getCoordinateRecords: function() {
      const tx = _db.transaction(['coordinateRecords'], 'readonly');
      const store = tx.objectStore('coordinateRecords');
      return _wait(store.getAll());
    },

    exportAll: function() {
      const settings = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(_prefix)) {
          settings[key] = localStorage.getItem(key);
        }
      }

      return Promise.all([
        this.getGameRecords(),
        this.getStats(),
        this.getCoordinateRecords()
      ]).then(function(results) {
        const data = {
          version: 1,
          exportedAt: new Date().toISOString(),
          settings: settings,
          gameRecords: results[0],
          stats: results[1],
          coordinateRecords: results[2]
        };
        return JSON.stringify(data);
      });
    },

    importAll: function(jsonString) {
      let data;
      try {
        data = JSON.parse(jsonString);
      } catch (e) {
        throw new Error('Invalid JSON: ' + e.message);
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data structure');
      }
      if (!Array.isArray(data.gameRecords)) {
        throw new Error('Missing gameRecords array');
      }
      if (!Array.isArray(data.stats)) {
        throw new Error('Missing stats array');
      }
      if (!Array.isArray(data.coordinateRecords)) {
        throw new Error('Missing coordinateRecords array');
      }
      if (!data.settings || typeof data.settings !== 'object') {
        throw new Error('Missing settings object');
      }

      const self = this;
      return this.clearAll().then(function() {
        for (const key in data.settings) {
          if (data.settings.hasOwnProperty(key)) {
            localStorage.setItem(key, data.settings[key]);
          }
        }

        const promises = [];
        data.gameRecords.forEach(function(r) {
          promises.push(self.addGameRecord(r));
        });
        data.stats.forEach(function(s) {
          promises.push(self.addStat(s));
        });
        data.coordinateRecords.forEach(function(r) {
          promises.push(self.addCoordinateRecord(r));
        });
        return Promise.all(promises);
      });
    },

    downloadPgn: function(pgnText) {
      const blob = new Blob([pgnText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'blindfold-chess-game-' + new Date().toISOString().slice(0, 10) + '.pgn';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    clearAll: function() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(_prefix)) {
          keys.push(key);
        }
      }
      keys.forEach(function(k) { localStorage.removeItem(k); });

      if (!_db) return Promise.resolve();

      const tx = _db.transaction(['gameRecords', 'stats', 'coordinateRecords'], 'readwrite');
      return Promise.all([
        _wait(tx.objectStore('gameRecords').clear()),
        _wait(tx.objectStore('stats').clear()),
        _wait(tx.objectStore('coordinateRecords').clear())
      ]);
    }
  };

  window.StorageModule = StorageModule;

  /* ------------------------------------------------------------------ */
  /*  Node.js self-test                                                 */
  /* ------------------------------------------------------------------ */

  if (typeof require !== 'undefined' && require.main === module) {
    require('./test-runner.js');
    const TR = window.TestRunner;

    TR.suite('StorageModule', function() {

      // -------- SM-31: localStorage --------
      TR.test('SM-31: set/get string', function() {
        StorageModule.set('test_str', 'hello');
        TR.assertEqual(StorageModule.get('test_str'), 'hello');
      });

      TR.test('SM-31: set/get object', function() {
        StorageModule.set('test_obj', { a: 1, b: [2, 3] });
        TR.assertEqual(StorageModule.get('test_obj'), { a: 1, b: [2, 3] });
      });

      TR.test('SM-31: set/get number', function() {
        StorageModule.set('test_num', 42);
        TR.assertEqual(StorageModule.get('test_num'), 42);
      });

      TR.test('SM-31: get non-existent key returns null', function() {
        TR.assertEqual(StorageModule.get('nonexistent_key_xyz'), null);
      });

      TR.test('SM-31: remove deletes key', function() {
        StorageModule.set('to_remove', 'val');
        StorageModule.remove('to_remove');
        TR.assertEqual(StorageModule.get('to_remove'), null);
      });

      TR.test('SM-31: invalid JSON in storage returns null', function() {
        localStorage.setItem(_prefix + 'bad_json', 'not json');
        TR.assertEqual(StorageModule.get('bad_json'), null);
      });

      // -------- SM-32: IndexedDB --------
      TR.test('SM-32: init opens database', async function() {
        await StorageModule.init();
        TR.assert(true);
      });

      TR.test('SM-32: addGameRecord and getGameRecords', async function() {
        await StorageModule.clearAll();
        await StorageModule.addGameRecord({
          difficulty: 'easy',
          result: '1-0',
          pgn: '1.e4 e5 2.Nf3',
          moves: 2,
          duration: 60
        });
        const records = await StorageModule.getGameRecords();
        TR.assertEqual(records.length, 1);
        TR.assertEqual(records[0].difficulty, 'easy');
      });

      TR.test('SM-32: getGameRecordById', async function() {
        await StorageModule.clearAll();
        const rec = { difficulty: 'hard', result: '0-1', pgn: '1.d4', moves: 1, duration: 30 };
        await StorageModule.addGameRecord(rec);
        const found = await StorageModule.getGameRecordById(rec.id);
        TR.assertEqual(found.difficulty, 'hard');
      });

      TR.test('SM-32: deleteGameRecord', async function() {
        await StorageModule.clearAll();
        const rec = { difficulty: 'medium', result: '1/2-1/2', pgn: '1.e4', moves: 1, duration: 10 };
        await StorageModule.addGameRecord(rec);
        await StorageModule.deleteGameRecord(rec.id);
        const found = await StorageModule.getGameRecordById(rec.id);
        TR.assertEqual(found, undefined);
      });

      TR.test('SM-32: getGameRecords filter by difficulty', async function() {
        await StorageModule.clearAll();
        await StorageModule.addGameRecord({ difficulty: 'easy', result: '1-0', pgn: '1.e4', moves: 1, duration: 10 });
        await StorageModule.addGameRecord({ difficulty: 'hard', result: '0-1', pgn: '1.d4', moves: 1, duration: 10 });
        const easy = await StorageModule.getGameRecords({ difficulty: 'easy' });
        TR.assertEqual(easy.length, 1);
        TR.assertEqual(easy[0].difficulty, 'easy');
      });

      TR.test('SM-32: getGameRecords filter by result', async function() {
        await StorageModule.clearAll();
        await StorageModule.addGameRecord({ difficulty: 'easy', result: '1-0', pgn: '1.e4', moves: 1, duration: 10 });
        await StorageModule.addGameRecord({ difficulty: 'easy', result: '0-1', pgn: '1.d4', moves: 1, duration: 10 });
        const wins = await StorageModule.getGameRecords({ result: '1-0' });
        TR.assertEqual(wins.length, 1);
      });

      TR.test('SM-32: getGameRecords filter by date range', async function() {
        await StorageModule.clearAll();
        await StorageModule.addGameRecord({ id: 'r1', date: '2026-01-01T00:00:00.000Z', difficulty: 'easy', result: '1-0', pgn: '1.e4', moves: 1, duration: 10 });
        await StorageModule.addGameRecord({ id: 'r2', date: '2026-06-01T00:00:00.000Z', difficulty: 'easy', result: '1-0', pgn: '1.d4', moves: 1, duration: 10 });
        const filtered = await StorageModule.getGameRecords({ startDate: '2026-05-01T00:00:00.000Z', endDate: '2026-12-31T00:00:00.000Z' });
        TR.assertEqual(filtered.length, 1);
        TR.assertEqual(filtered[0].id, 'r2');
      });

      TR.test('SM-32: addStat and getStats', async function() {
        await StorageModule.clearAll();
        await StorageModule.addStat({ type: 'game', score: 100, accuracy: 0.8 });
        await StorageModule.addStat({ type: 'coordinate', score: 50, accuracy: 0.9 });
        const all = await StorageModule.getStats();
        TR.assertEqual(all.length, 2);
      });

      TR.test('SM-32: getStats filter by type', async function() {
        await StorageModule.clearAll();
        await StorageModule.addStat({ type: 'game', score: 100, accuracy: 0.8 });
        await StorageModule.addStat({ type: 'coordinate', score: 50, accuracy: 0.9 });
        const gameStats = await StorageModule.getStats('game');
        TR.assertEqual(gameStats.length, 1);
        TR.assertEqual(gameStats[0].type, 'game');
      });

      TR.test('SM-32: getStatsByDateRange', async function() {
        await StorageModule.clearAll();
        await StorageModule.addStat({ id: 's1', date: '2026-01-01T00:00:00.000Z', type: 'game', score: 10, accuracy: 0.5 });
        await StorageModule.addStat({ id: 's2', date: '2026-06-01T00:00:00.000Z', type: 'game', score: 20, accuracy: 0.6 });
        const filtered = await StorageModule.getStatsByDateRange('2026-05-01T00:00:00.000Z', '2026-12-31T00:00:00.000Z');
        TR.assertEqual(filtered.length, 1);
        TR.assertEqual(filtered[0].id, 's2');
      });

      TR.test('SM-32: addCoordinateRecord and getCoordinateRecords', async function() {
        await StorageModule.clearAll();
        await StorageModule.addCoordinateRecord({ mode: 'a', side: 'white', score: 10, total: 20, accuracy: 0.5, duration: 30 });
        const recs = await StorageModule.getCoordinateRecords();
        TR.assertEqual(recs.length, 1);
        TR.assertEqual(recs[0].mode, 'a');
      });

      TR.test('SM-32: addGameRecord auto-generates id and date', async function() {
        await StorageModule.clearAll();
        const rec = { difficulty: 'expert', result: '*', pgn: '', moves: 0, duration: 0 };
        await StorageModule.addGameRecord(rec);
        TR.assert(typeof rec.id === 'string' && rec.id.length > 0, 'id should be generated');
        TR.assert(typeof rec.date === 'string' && rec.date.length > 0, 'date should be generated');
        TR.assertEqual(rec.mode, 'blindfold');
      });

      TR.test('SM-32: invalid record throws', async function() {
        let err = null;
        try { await StorageModule.addGameRecord(null); } catch (e) { err = e; }
        TR.assert(err !== null, 'should throw on null record');
      });

      // -------- SM-33: Export --------
      TR.test('SM-33: exportAll returns valid JSON with all sections', async function() {
        await StorageModule.clearAll();
        StorageModule.set('theme', 'dark');
        await StorageModule.addGameRecord({ difficulty: 'easy', result: '1-0', pgn: '1.e4', moves: 1, duration: 10 });
        await StorageModule.addStat({ type: 'game', score: 100, accuracy: 0.8 });
        await StorageModule.addCoordinateRecord({ mode: 'a', side: 'white', score: 5, total: 10, accuracy: 0.5, duration: 20 });

        const json = await StorageModule.exportAll();
        const data = JSON.parse(json);
        TR.assertEqual(data.version, 1);
        TR.assert(typeof data.exportedAt === 'string', 'exportedAt should be string');
        TR.assert(typeof data.settings === 'object' && data.settings !== null, 'settings should be object');
        TR.assert(Array.isArray(data.gameRecords), 'gameRecords should be array');
        TR.assert(Array.isArray(data.stats), 'stats should be array');
        TR.assert(Array.isArray(data.coordinateRecords), 'coordinateRecords should be array');
        TR.assertEqual(data.gameRecords.length, 1);
        TR.assertEqual(data.stats.length, 1);
        TR.assertEqual(data.coordinateRecords.length, 1);
      });

      // -------- SM-34: Import --------
      TR.test('SM-34: importAll restores data correctly', async function() {
        await StorageModule.clearAll();
        const payload = {
          version: 1,
          exportedAt: new Date().toISOString(),
          settings: { 'blindfold_chess_lang': '"zh"' },
          gameRecords: [{ id: 'g1', date: '2026-01-01T00:00:00.000Z', mode: 'blindfold', difficulty: 'easy', result: '1-0', pgn: '1.e4', moves: 1, duration: 10 }],
          stats: [{ id: 's1', date: '2026-01-01T00:00:00.000Z', type: 'game', score: 100, accuracy: 0.8 }],
          coordinateRecords: [{ id: 'c1', date: '2026-01-01T00:00:00.000Z', mode: 'a', side: 'white', score: 5, total: 10, accuracy: 0.5, duration: 20 }]
        };
        await StorageModule.importAll(JSON.stringify(payload));

        TR.assertEqual(StorageModule.get('lang'), 'zh');
        const games = await StorageModule.getGameRecords();
        TR.assertEqual(games.length, 1);
        TR.assertEqual(games[0].id, 'g1');
        const stats = await StorageModule.getStats();
        TR.assertEqual(stats.length, 1);
        TR.assertEqual(stats[0].id, 's1');
        const coords = await StorageModule.getCoordinateRecords();
        TR.assertEqual(coords.length, 1);
        TR.assertEqual(coords[0].id, 'c1');
      });

      TR.test('SM-34: importAll rejects invalid JSON', async function() {
        let err = null;
        try { await StorageModule.importAll('not json'); } catch (e) { err = e; }
        TR.assert(err !== null, 'should throw on invalid JSON');
      });

      TR.test('SM-34: importAll rejects missing gameRecords', async function() {
        let err = null;
        try { await StorageModule.importAll(JSON.stringify({ version: 1, exportedAt: '', settings: {}, stats: [], coordinateRecords: [] })); } catch (e) { err = e; }
        TR.assert(err !== null, 'should throw on missing gameRecords');
      });

      TR.test('SM-34: importAll rejects missing stats', async function() {
        let err = null;
        try { await StorageModule.importAll(JSON.stringify({ version: 1, exportedAt: '', settings: {}, gameRecords: [], coordinateRecords: [] })); } catch (e) { err = e; }
        TR.assert(err !== null, 'should throw on missing stats');
      });

      TR.test('SM-34: importAll rejects missing coordinateRecords', async function() {
        let err = null;
        try { await StorageModule.importAll(JSON.stringify({ version: 1, exportedAt: '', settings: {}, gameRecords: [], stats: [] })); } catch (e) { err = e; }
        TR.assert(err !== null, 'should throw on missing coordinateRecords');
      });

      // -------- SM-35: Performance --------
      TR.test('SM-35: bulk insert 100 records and query', async function() {
        await StorageModule.clearAll();
        const t0 = Date.now();
        for (let i = 0; i < 100; i++) {
          await StorageModule.addGameRecord({
            difficulty: 'easy',
            result: '1-0',
            pgn: '1.e4 e5',
            moves: 10,
            duration: 120
          });
        }
        const records = await StorageModule.getGameRecords();
        const elapsed = Date.now() - t0;
        TR.assertEqual(records.length, 100);
        TR.assert(elapsed < 5000, 'Bulk insert took ' + elapsed + 'ms, expected < 5000ms');
      });

      // -------- clearAll --------
      TR.test('clearAll empties localStorage and IndexedDB', async function() {
        StorageModule.set('temp_key', 'temp_val');
        await StorageModule.addGameRecord({ difficulty: 'easy', result: '1-0', pgn: '1.e4', moves: 1, duration: 10 });
        await StorageModule.clearAll();
        TR.assertEqual(StorageModule.get('temp_key'), null);
        const records = await StorageModule.getGameRecords();
        TR.assertEqual(records.length, 0);
        const stats = await StorageModule.getStats();
        TR.assertEqual(stats.length, 0);
        const coords = await StorageModule.getCoordinateRecords();
        TR.assertEqual(coords.length, 0);
      });

      // -------- downloadPgn --------
      TR.test('downloadPgn function exists', function() {
        TR.assert(typeof StorageModule.downloadPgn === 'function', 'downloadPgn should be a function');
      });

    });

    TR.run().then(function(r) {
      if (r.failed > 0) {
        console.error('StorageModule self-test failed');
        if (typeof process !== 'undefined') process.exit(1);
      } else {
        console.log('StorageModule self-test passed (' + r.passed + '/' + (r.passed + r.failed) + ')');
      }
    });
  }

})();
