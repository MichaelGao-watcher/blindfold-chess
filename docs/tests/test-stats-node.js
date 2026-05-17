/**
 * Node.js test runner for StatsModule.
 */

'use strict';

// ── Minimal DOM Mock ──

class MockStorage {
  constructor() { this._data = new Map(); }
  getItem(k) { return this._data.has(k) ? this._data.get(k) : null; }
  setItem(k, v) { this._data.set(k, String(v)); }
  removeItem(k) { this._data.delete(k); }
  clear() { this._data.clear(); }
}

// ── Inject globals ──

global.window = global;
global.localStorage = new MockStorage();
global.document = {
  getElementById: function() { return null; },
  createElement: function(tag) { return { style: {}, textContent: '', appendChild: function() {} }; },
  body: { appendChild: function() {}, removeChild: function() {} }
};

// ── Load dependencies ──

require('../../js/test-runner.js');
require('../../js/stats.js');

// ── Helpers ──

function resetData() {
  localStorage.clear();
  if (window.StorageModule) window.StorageModule.__testRecords = null;
  if (window.StorageModule) window.StorageModule.__testCoordRecords = null;
}

function setTestRecords(recs) {
  if (window.StorageModule) window.StorageModule.__testRecords = recs;
  localStorage.setItem('blindfold_chess_test_records', JSON.stringify(recs));
}

function setTestCoordRecords(recs) {
  if (window.StorageModule) window.StorageModule.__testCoordRecords = recs;
  localStorage.setItem('blindfold_chess_test_coord_records', JSON.stringify(recs));
}

// ── Test suites ──

TestRunner.suite('StatsModule API', function() {
  TestRunner.test('StatsModule exposed on window', function() {
    TestRunner.assert(typeof window.StatsModule === 'object');
  });
  TestRunner.test('init is a function', function() {
    TestRunner.assert(typeof window.StatsModule.init === 'function');
  });
  TestRunner.test('getGameHistory is a function', function() {
    TestRunner.assert(typeof window.StatsModule.getGameHistory === 'function');
  });
  TestRunner.test('getWinRate is a function', function() {
    TestRunner.assert(typeof window.StatsModule.getWinRate === 'function');
  });
  TestRunner.test('getProgressData is a function', function() {
    TestRunner.assert(typeof window.StatsModule.getProgressData === 'function');
  });
  TestRunner.test('exportData is a function', function() {
    TestRunner.assert(typeof window.StatsModule.exportData === 'function');
  });
  TestRunner.test('clearData is a function', function() {
    TestRunner.assert(typeof window.StatsModule.clearData === 'function');
  });
  TestRunner.test('recordGameResult is a function', function() {
    TestRunner.assert(typeof window.StatsModule.recordGameResult === 'function');
  });
  TestRunner.test('getBadges is a function', function() {
    TestRunner.assert(typeof window.StatsModule.getBadges === 'function');
  });
  TestRunner.test('getCoordinateStats is a function', function() {
    TestRunner.assert(typeof window.StatsModule.getCoordinateStats === 'function');
  });
});

TestRunner.suite('StatsModule.getGameHistory', function() {
  TestRunner.test('returns empty array when no records', function() {
    resetData();
    var hist = StatsModule.getGameHistory();
    TestRunner.assertEqual(hist.length, 0);
  });

  TestRunner.test('returns records sorted by date descending', function() {
    resetData();
    setTestRecords([
      { id: '1', date: '2026-01-01T00:00:00Z', difficulty: 'easy', result: '1-0', pgn: '', moves: 10, duration: 60 },
      { id: '2', date: '2026-03-01T00:00:00Z', difficulty: 'hard', result: '0-1', pgn: '', moves: 20, duration: 120 },
      { id: '3', date: '2026-02-01T00:00:00Z', difficulty: 'medium', result: '1/2-1/2', pgn: '', moves: 15, duration: 90 }
    ]);
    var hist = StatsModule.getGameHistory();
    TestRunner.assertEqual(hist.length, 3);
    TestRunner.assertEqual(hist[0].id, '2'); // newest first
    TestRunner.assertEqual(hist[2].id, '1'); // oldest last
  });
});

TestRunner.suite('StatsModule.getWinRate', function() {
  TestRunner.test('returns zero stats when no records', function() {
    resetData();
    var wr = StatsModule.getWinRate();
    TestRunner.assertEqual(wr.total, 0);
    TestRunner.assertEqual(wr.wins, 0);
    TestRunner.assertEqual(wr.rate, 0);
  });

  TestRunner.test('calculates total win rate correctly', function() {
    resetData();
    setTestRecords([
      { result: '1-0' }, { result: '1-0' }, { result: '0-1' }, { result: '1/2-1/2' }
    ]);
    var wr = StatsModule.getWinRate();
    TestRunner.assertEqual(wr.total, 4);
    TestRunner.assertEqual(wr.wins, 2);
    TestRunner.assertEqual(wr.losses, 1);
    TestRunner.assertEqual(wr.draws, 1);
    TestRunner.assertEqual(wr.rate, 0.5);
  });

  TestRunner.test('filters by difficulty', function() {
    resetData();
    setTestRecords([
      { difficulty: 'easy', result: '1-0' },
      { difficulty: 'easy', result: '1-0' },
      { difficulty: 'hard', result: '0-1' }
    ]);
    var easy = StatsModule.getWinRate('easy');
    TestRunner.assertEqual(easy.total, 2);
    TestRunner.assertEqual(easy.wins, 2);
    var hard = StatsModule.getWinRate('hard');
    TestRunner.assertEqual(hard.total, 1);
    TestRunner.assertEqual(hard.losses, 1);
  });

  TestRunner.test('all losses gives 0 rate', function() {
    resetData();
    setTestRecords([{ result: '0-1' }, { result: '0-1' }]);
    var wr = StatsModule.getWinRate();
    TestRunner.assertEqual(wr.rate, 0);
  });

  TestRunner.test('all wins gives 1 rate', function() {
    resetData();
    setTestRecords([{ result: '1-0' }, { result: '1-0' }]);
    var wr = StatsModule.getWinRate();
    TestRunner.assertEqual(wr.rate, 1);
  });
});

TestRunner.suite('StatsModule.getProgressData', function() {
  TestRunner.test('returns empty trends when no records', function() {
    resetData();
    var pd = StatsModule.getProgressData();
    TestRunner.assertEqual(pd.durationTrend.length, 0);
    TestRunner.assertEqual(pd.movesTrend.length, 0);
  });

  TestRunner.test('duration trend has same length as records', function() {
    resetData();
    setTestRecords([
      { date: '2026-01-01', duration: 60, moves: 10 },
      { date: '2026-01-02', duration: 120, moves: 20 }
    ]);
    var pd = StatsModule.getProgressData();
    TestRunner.assertEqual(pd.durationTrend.length, 2);
    TestRunner.assertEqual(pd.movesTrend.length, 2);
  });

  TestRunner.test('win rate by difficulty tracks correctly', function() {
    resetData();
    setTestRecords([
      { date: '2026-01-01', difficulty: 'easy', result: '1-0' },
      { date: '2026-01-02', difficulty: 'easy', result: '0-1' },
      { date: '2026-01-03', difficulty: 'easy', result: '1-0' }
    ]);
    var pd = StatsModule.getProgressData();
    var easyTrend = pd.winRateByDifficulty.easy;
    TestRunner.assertEqual(easyTrend.length, 3);
    TestRunner.assertEqual(easyTrend[0].value, 1);
    TestRunner.assertEqual(easyTrend[1].value, 0.5);
    TestRunner.assert(Math.abs(easyTrend[2].value - 2 / 3) < 0.001, 'expected ~0.667 but got ' + easyTrend[2].value);
  });
});

TestRunner.suite('StatsModule.exportData', function() {
  TestRunner.test('json export contains records', function() {
    resetData();
    setTestRecords([{ id: '1', result: '1-0' }]);
    var json = StatsModule.exportData('json');
    var data = JSON.parse(json);
    TestRunner.assert(Array.isArray(data.gameRecords), 'gameRecords should be array');
    TestRunner.assertEqual(data.gameRecords.length, 1);
  });

  TestRunner.test('pgn export concatenates pgns', function() {
    resetData();
    setTestRecords([
      { pgn: '1.e4 e5' },
      { pgn: '1.d4 d5' }
    ]);
    var pgn = StatsModule.exportData('pgn');
    TestRunner.assert(pgn.indexOf('1.e4 e5') !== -1);
    TestRunner.assert(pgn.indexOf('1.d4 d5') !== -1);
  });

  TestRunner.test('unknown format returns empty string', function() {
    resetData();
    TestRunner.assertEqual(StatsModule.exportData('xml'), '');
  });
});

TestRunner.suite('StatsModule.recordGameResult', function() {
  TestRunner.test('adds a record', function() {
    resetData();
    StatsModule.recordGameResult({ id: 'r1', result: '1-0', moves: 10 });
    var hist = StatsModule.getGameHistory();
    TestRunner.assertEqual(hist.length, 1);
    TestRunner.assertEqual(hist[0].id, 'r1');
  });

  TestRunner.test('ignores invalid input', function() {
    resetData();
    StatsModule.recordGameResult(null);
    StatsModule.recordGameResult('string');
    TestRunner.assertEqual(StatsModule.getGameHistory().length, 0);
  });
});

TestRunner.suite('StatsModule.clearData', function() {
  TestRunner.test('clears all test records', function() {
    resetData();
    StatsModule.recordGameResult({ id: '1', result: '1-0' });
    StatsModule.clearData();
    TestRunner.assertEqual(StatsModule.getGameHistory().length, 0);
  });
});

TestRunner.suite('StatsModule.getBadges', function() {
  TestRunner.test('no records = all locked', function() {
    resetData();
    var badges = StatsModule.getBadges();
    TestRunner.assertEqual(badges.length, 5);
    for (var i = 0; i < badges.length; i++) {
      TestRunner.assertEqual(badges[i].unlocked, false);
    }
  });

  TestRunner.test('first_step unlocked with any game', function() {
    resetData();
    setTestRecords([{ result: '*' }]);
    var badges = StatsModule.getBadges();
    var first = badges.find(function(b) { return b.id === 'first_step'; });
    TestRunner.assertEqual(first.unlocked, true);
  });

  TestRunner.test('first_win unlocked with 1-0', function() {
    resetData();
    setTestRecords([{ result: '1-0' }]);
    var badges = StatsModule.getBadges();
    var win = badges.find(function(b) { return b.id === 'first_win'; });
    TestRunner.assertEqual(win.unlocked, true);
  });

  TestRunner.test('first_loss unlocked with 0-1', function() {
    resetData();
    setTestRecords([{ result: '0-1' }]);
    var badges = StatsModule.getBadges();
    var loss = badges.find(function(b) { return b.id === 'first_loss'; });
    TestRunner.assertEqual(loss.unlocked, true);
  });

  TestRunner.test('ten_moves unlocked with 10+ moves', function() {
    resetData();
    setTestRecords([{ result: '1-0', moves: 12 }]);
    var badges = StatsModule.getBadges();
    var ten = badges.find(function(b) { return b.id === 'ten_moves'; });
    TestRunner.assertEqual(ten.unlocked, true);
  });

  TestRunner.test('ten_moves locked with <10 moves', function() {
    resetData();
    setTestRecords([{ result: '1-0', moves: 5 }]);
    var badges = StatsModule.getBadges();
    var ten = badges.find(function(b) { return b.id === 'ten_moves'; });
    TestRunner.assertEqual(ten.unlocked, false);
  });

  TestRunner.test('unyielding unlocked after 3 losses in a row with more games', function() {
    resetData();
    setTestRecords([
      { result: '0-1' }, { result: '0-1' }, { result: '0-1' }, { result: '1-0' }
    ]);
    var badges = StatsModule.getBadges();
    var uny = badges.find(function(b) { return b.id === 'unyielding'; });
    TestRunner.assertEqual(uny.unlocked, true);
  });

  TestRunner.test('unyielding locked if 3 losses at end with no more games', function() {
    resetData();
    setTestRecords([
      { result: '0-1' }, { result: '0-1' }, { result: '0-1' }
    ]);
    var badges = StatsModule.getBadges();
    var uny = badges.find(function(b) { return b.id === 'unyielding'; });
    TestRunner.assertEqual(uny.unlocked, false);
  });
});

TestRunner.suite('StatsModule.getCoordinateStats', function() {
  TestRunner.test('returns zero when no records', function() {
    resetData();
    var cs = StatsModule.getCoordinateStats();
    TestRunner.assertEqual(cs.total, 0);
    TestRunner.assertEqual(cs.bestScore, 0);
    TestRunner.assertEqual(cs.avgAccuracy, 0);
  });

  TestRunner.test('calculates stats correctly', function() {
    resetData();
    setTestCoordRecords([
      { score: 10, accuracy: 0.5 },
      { score: 20, accuracy: 0.8 }
    ]);
    var cs = StatsModule.getCoordinateStats();
    TestRunner.assertEqual(cs.total, 2);
    TestRunner.assertEqual(cs.bestScore, 20);
    TestRunner.assertEqual(cs.avgAccuracy, 0.65);
  });
});

TestRunner.suite('Global pollution check', function() {
  TestRunner.test('no unexpected globals leaked', function() {
    TestRunner.assert(typeof window._badges === 'undefined', '_badges leaked');
    TestRunner.assert(typeof window._getLang === 'undefined', '_getLang leaked');
    TestRunner.assert(typeof window._tBadge === 'undefined', '_tBadge leaked');
    TestRunner.assert(typeof window._getRecords === 'undefined', '_getRecords leaked');
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
