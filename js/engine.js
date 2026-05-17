// Node.js compatibility
if (typeof global !== 'undefined' && typeof window === 'undefined') {
  global.window = global;
}

// Worker mock for Node.js / test environment
if (typeof Worker === 'undefined') {
  class MockWorker {
    constructor(url) {
      this.url = url;
      this.onmessage = null;
      this.onerror = null;
      this._multiPv = 1;
      this._timeouts = [];
    }

    postMessage(msg) {
      if (typeof msg !== 'string') return;
      const parts = msg.split(' ');

      if (msg === 'uci') {
        this._emitLater('Stockfish 18 Mock', 0);
        this._emitLater('uciok', 10);
      } else if (msg === 'isready') {
        this._emitLater('readyok', 10);
      } else if (msg === 'ucinewgame') {
        // no response
      } else if (msg.startsWith('position ')) {
        // no response
      } else if (msg.startsWith('setoption ')) {
        if (msg.includes('MultiPV')) {
          this._multiPv = parseInt(parts[parts.length - 1]) || 1;
        }
        // no response for other options
      } else if (msg.startsWith('go ')) {
        this._startThinking();
      } else if (msg === 'stop') {
        this._clearTimeouts();
        // Emit bestmove so stop->go sequences work correctly in state machine
        this._emitLater('bestmove e2e4', 10);
      }
    }

    _emitLater(data, delay) {
      const id = setTimeout(() => {
        if (this.onmessage) this.onmessage({ data });
      }, delay);
      this._timeouts.push(id);
    }

    _clearTimeouts() {
      this._timeouts.forEach(id => clearTimeout(id));
      this._timeouts = [];
    }

    _startThinking() {
      const multiPv = this._multiPv;
      const moves = ['e2e4', 'd2d4', 'g1f3', 'c2c4', 'b1c3'];
      const scores = [35, 25, 20, 15, 10];

      let delay = 50;

      for (let i = 1; i <= multiPv && i <= moves.length; i++) {
        const score = scores[i - 1] || 0;
        const move = moves[i - 1];
        const pv = `${move} e7e5 g1f3 b8c6 f1b5`;
        this._emitLater(`info depth 10 multipv ${i} score cp ${score} pv ${pv}`, delay);
        delay += 20;
      }

      // Emit a mate score for single-PV to test mate formatting
      if (multiPv === 1) {
        this._emitLater('info depth 5 multipv 1 score mate 3 pv h7h8q', delay);
        delay += 20;
      }

      this._emitLater('bestmove e2e4', delay + 30);
    }

    terminate() {
      this._clearTimeouts();
    }
  }

  global.Worker = MockWorker;
}

(function() {
  'use strict';

  // Internal state
  let _worker = null;
  let _state = 'idle';
  let _currentDepth = 10;
  let _currentGoCb = null;
  let _currentMultiPvCb = null;
  let _multiPvResults = [];
  let _goTimeout = null;
  let _initPromise = null;
  let _initResolve = null;
  let _initReject = null;
  let _initTimeoutId = null;
  let _bootLines = [];
  let _GO_TIMEOUT_MS = 30000;

  const ENGINE_URL = 'https://unpkg.com/stockfish@18.0.7/bin/stockfish-18-lite-single.js';
  const WASM_URL = 'https://unpkg.com/stockfish@18.0.7/bin/stockfish-18-lite-single.wasm';

  function _clearGoTimeout() {
    if (_goTimeout) {
      clearTimeout(_goTimeout);
      _goTimeout = null;
    }
  }

  function _resetInitState() {
    _initPromise = null;
    _initResolve = null;
    _initReject = null;
    if (_initTimeoutId) {
      clearTimeout(_initTimeoutId);
      _initTimeoutId = null;
    }
  }

  function _post(msg) {
    if (_worker && _state !== 'terminated') {
      _worker.postMessage(msg);
    }
  }

  function _formatScore(scoreType, scoreValue) {
    if (scoreType === 'mate') {
      return scoreValue > 0 ? `M${scoreValue}` : `-M${Math.abs(scoreValue)}`;
    }
    const val = scoreValue / 100;
    let str = (val >= 0 ? '+' : '') + val.toFixed(2);
    str = str.replace(/\.?0+$/, '');
    if (str === '+' || str === '-') str += '0';
    return str;
  }

  function _parseInfoLine(msg) {
    const multipvMatch = msg.match(/multipv\s+(\d+)/i);
    const scoreCpMatch = msg.match(/score\s+cp\s+(-?\d+)/i);
    const scoreMateMatch = msg.match(/score\s+mate\s+(-?\d+)/i);
    const pvMatch = msg.match(/\bpv\s+(.+)/i);

    if (!multipvMatch) return null;

    const multipv = parseInt(multipvMatch[1], 10);
    let score, scoreType, scoreValue;

    if (scoreMateMatch) {
      scoreType = 'mate';
      scoreValue = parseInt(scoreMateMatch[1], 10);
      score = _formatScore('mate', scoreValue);
    } else if (scoreCpMatch) {
      scoreType = 'cp';
      scoreValue = parseInt(scoreCpMatch[1], 10);
      score = _formatScore('cp', scoreValue);
    } else {
      return null;
    }

    const pv = pvMatch ? pvMatch[1].trim() : '';
    const move = pv.split(' ')[0] || '';

    return { multipv, move, score, scoreType, scoreValue, pv };
  }

  function _onWorkerMessage(e) {
    if (_state === 'terminated') return;

    const msg = typeof e.data === 'string' ? e.data : '';
    _bootLines.push(msg);

    if (msg.includes('uciok')) {
      if (_state === 'idle') {
        _state = 'ready';
        if (_initResolve) {
          _initResolve();
          _initResolve = null;
          _initReject = null;
        }
        if (_initTimeoutId) {
          clearTimeout(_initTimeoutId);
          _initTimeoutId = null;
        }
      }
      return;
    }

    if (msg.startsWith('bestmove')) {
      _clearGoTimeout();
      const parts = msg.split(' ');
      const bestMove = parts[1] === '(none)' ? null : parts[1];

      if (_state === 'stopping') {
        _state = 'ready';
        return;
      }

      if (_currentMultiPvCb) {
        _multiPvResults.sort((a, b) => a.multipv - b.multipv);
        const results = _multiPvResults.map(r => ({ move: r.move, score: r.score, pv: r.pv }));
        const cb = _currentMultiPvCb;
        _currentMultiPvCb = null;
        _multiPvResults = [];
        _currentGoCb = null;
        _state = 'ready';
        cb(results);
      } else if (_currentGoCb) {
        const cb = _currentGoCb;
        _currentGoCb = null;
        _state = 'ready';
        cb(bestMove);
      } else {
        _state = 'ready';
      }
      return;
    }

    // Parse info for multiPV
    if (msg.startsWith('info') && _currentMultiPvCb) {
      const info = _parseInfoLine(msg);
      if (info) {
        const existing = _multiPvResults.find(r => r.multipv === info.multipv);
        if (existing) {
          Object.assign(existing, info);
        } else {
          _multiPvResults.push(info);
        }
      }
    }
  }

  function _onWorkerError(err) {
    if (_state === 'terminated') return;
    console.error('Stockfish Worker error:', err);
    if (_initReject) {
      _initReject(err);
      _resetInitState();
    }
  }

  async function _createWorker() {
    let finalWorkerUrl = ENGINE_URL;

    try {
      const testWorker = new Worker(ENGINE_URL);
      testWorker.terminate();
    } catch (directErr) {
      console.log('Direct Worker blocked, trying Blob Worker...');
      try {
        const res = await fetch(ENGINE_URL);
        if (!res.ok) throw new Error('Failed to fetch Stockfish script: ' + res.status);
        const code = await res.text();
        const blob = new Blob([code], { type: 'application/javascript' });
        finalWorkerUrl = URL.createObjectURL(blob) + '#' + encodeURIComponent(WASM_URL);
      } catch (fetchErr) {
        throw new Error('Failed to load Stockfish Worker: ' + fetchErr.message);
      }
    }

    _worker = new Worker(finalWorkerUrl);
    _worker.onmessage = _onWorkerMessage;
    _worker.onerror = _onWorkerError;
    _post('uci');

    _initTimeoutId = setTimeout(() => {
      if (_initResolve) {
        const err = new Error('Stockfish init timeout (60s). The engine may be loading slowly on your connection.');
        console.error('Stockfish boot log:', _bootLines);
        if (_initReject) _initReject(err);
        _resetInitState();
      }
    }, 60000);
  }

  const EngineModule = {
    init() {
      if (_initPromise) return _initPromise;
      if (_state === 'ready' || _state === 'thinking' || _state === 'stopping') return Promise.resolve();
      if (_state === 'terminated') {
        _state = 'idle';
        _worker = null;
      }

      _bootLines = [];
      _initPromise = new Promise((resolve, reject) => {
        _initResolve = resolve;
        _initReject = reject;
        _createWorker().catch((err) => {
          _resetInitState();
          reject(err);
        });
      });

      return _initPromise;
    },

    setDifficulty(config) {
      if (_state === 'terminated') return;

      let elo, skill, depth;

      if (typeof config === 'string') {
        const presets = {
          easy: { elo: 800, skill: 5, depth: 8 },
          medium: { elo: 1400, skill: 10, depth: 10 },
          hard: { elo: 2000, skill: 15, depth: 14 },
          expert: { elo: 2800, skill: 20, depth: 18 }
        };
        const preset = presets[config] || presets.medium;
        elo = preset.elo;
        skill = preset.skill;
        depth = preset.depth;
      } else if (config && typeof config === 'object') {
        elo = config.elo;
        if (elo === undefined) {
          const presetElo = { easy: 800, medium: 1400, hard: 2000, expert: 2800 };
          elo = presetElo[config.level] || 1400;
        }
        elo = Math.max(400, Math.min(3200, elo));
        skill = config.skill !== undefined ? config.skill : Math.round((elo - 400) / 2800 * 20);
        depth = config.depth !== undefined ? config.depth : _currentDepth;
      } else {
        return;
      }

      _post('setoption name UCI_LimitStrength value true');
      _post(`setoption name UCI_Elo value ${elo}`);
      _post(`setoption name Skill Level value ${skill}`);
      _currentDepth = depth;
    },

    setPosition(fen) {
      if (_state === 'terminated') return;
      _post(`position fen ${fen}`);
    },

    go(callback) {
      if (_state === 'terminated') return;

      if (_state === 'thinking' || _state === 'stopping') {
        this.stop();
        setTimeout(() => this.go(callback), 20);
        return;
      }

      if (_state !== 'ready') {
        console.warn('EngineModule.go() called but engine is not ready');
        return;
      }

      _currentGoCb = callback;
      _currentMultiPvCb = null;
      _multiPvResults = [];
      _state = 'thinking';
      _post(`go depth ${_currentDepth}`);

      _goTimeout = setTimeout(() => {
        if (_state === 'thinking' && _currentGoCb === callback) {
          const cb = _currentGoCb;
          _currentGoCb = null;
          this.stop();
          if (cb) cb(null);
        }
      }, _GO_TIMEOUT_MS);
    },

    goMultiPv(callback, pvCount) {
      if (_state === 'terminated') return;

      if (_state === 'thinking' || _state === 'stopping') {
        this.stop();
        setTimeout(() => this.goMultiPv(callback, pvCount), 20);
        return;
      }

      if (_state !== 'ready') {
        console.warn('EngineModule.goMultiPv() called but engine is not ready');
        return;
      }

      const count = Math.max(1, Math.min(10, pvCount || 3));
      _currentMultiPvCb = callback;
      _currentGoCb = null;
      _multiPvResults = [];
      _state = 'thinking';

      _post(`setoption name MultiPV value ${count}`);
      _post(`go depth ${_currentDepth}`);

      _goTimeout = setTimeout(() => {
        if (_state === 'thinking' && _currentMultiPvCb === callback) {
          const cb = _currentMultiPvCb;
          _currentMultiPvCb = null;
          _multiPvResults = [];
          this.stop();
          if (cb) cb(null);
        }
      }, _GO_TIMEOUT_MS);
    },

    stop() {
      if (_state === 'terminated') return;

      if (_state === 'thinking' || _state === 'stopping') {
        _clearGoTimeout();
        _post('stop');
        _currentGoCb = null;
        _currentMultiPvCb = null;
        _multiPvResults = [];
        _state = 'stopping';
      }
    },

    terminate() {
      _clearGoTimeout();
      if (_worker) {
        _worker.terminate();
      }
      _worker = null;
      _state = 'terminated';
      _resetInitState();
      _currentGoCb = null;
      _currentMultiPvCb = null;
      _multiPvResults = [];
    },

    isReady() {
      return _state === 'ready';
    },

    // Test-only helpers (not part of public API)
    __getState() {
      return _state;
    },

    __getWorker() {
      return _worker;
    },

    __TEST_SET_TIMEOUT(ms) {
      _GO_TIMEOUT_MS = ms;
    }
  };

  window.EngineModule = EngineModule;

  // ── Legacy compatibility: EngineManager (used by old game.js) ──
  window.EngineManager = function() {
    this.ready = false;
    this.onEngineMove = null;
  };
  window.EngineManager.prototype.init = async function() {
    await EngineModule.init();
    this.ready = true;
  };
  window.EngineManager.prototype.setDifficulty = function(level) {
    EngineModule.setDifficulty(level);
  };
  window.EngineManager.prototype.newGame = function() {
    // no-op; EngineModule handles new game internally
  };
  window.EngineManager.prototype.setPosition = function(fen) {
    EngineModule.setPosition(fen);
  };
  window.EngineManager.prototype.go = function() {
    const self = this;
    EngineModule.go(function(bestMove) {
      if (self.onEngineMove) self.onEngineMove(bestMove);
    });
  };
  window.EngineManager.prototype.terminate = function() {
    EngineModule.terminate();
    this.ready = false;
  };

  // Node.js self-test mode
  if (typeof require !== 'undefined' && require.main === module) {
    require('./test-runner.js');
    require('../docs/tests/test-engine-cases.js');
    TestRunner.run().then(r => {
      console.log(`EngineModule Tests: ${r.passed} passed, ${r.failed} failed, ${r.totalMs}ms`);
      if (r.failed > 0 && typeof process !== 'undefined') process.exit(1);
    });
  }
})();
