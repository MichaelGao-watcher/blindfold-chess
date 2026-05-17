(function() {
  'use strict';

  if (typeof window === 'undefined') global.window = global;

  // =====================================================================
  //  Badge definitions
  // =====================================================================
  const _badges = [
    { id: 'first_step',    nameZh: '第一步',    nameEn: 'First Step',
      descZh: '完成过任意对局', descEn: 'Completed any game',
      condition: function(recs) { return recs.length > 0; } },
    { id: 'first_loss',    nameZh: '初尝败绩',  nameEn: 'First Loss',
      descZh: '输掉第一局', descEn: 'Lost your first game',
      condition: function(recs) { return recs.some(function(r) { return r.result === '0-1'; }); } },
    { id: 'ten_moves',     nameZh: '十步之遥',  nameEn: 'Ten Moves',
      descZh: '单局存活超过10步', descEn: 'Survived 10+ moves in a game',
      condition: function(recs) { return recs.some(function(r) { return r.moves >= 10; }); } },
    { id: 'first_win',     nameZh: '首胜',      nameEn: 'First Win',
      descZh: '赢得第一局', descEn: 'Won your first game',
      condition: function(recs) { return recs.some(function(r) { return r.result === '1-0'; }); } },
    { id: 'unyielding',    nameZh: '连败不屈',  nameEn: 'Unyielding',
      descZh: '连续输3局后仍继续', descEn: 'Kept playing after 3 losses in a row',
      condition: function(recs) {
        var streak = 0;
        for (var i = 0; i < recs.length; i++) {
          if (recs[i].result === '0-1') { streak++; }
          else { streak = 0; }
          if (streak >= 3 && i < recs.length - 1) return true;
        }
        return false;
      } }
  ];

  // =====================================================================
  //  Helpers
  // =====================================================================
  function _getLang() {
    if (window.SettingsModule && typeof SettingsModule.get === 'function') {
      var lang = SettingsModule.get('lang');
      if (lang === 'zh' || lang === 'en') return lang;
    }
    try { var raw = localStorage.getItem('lang'); if (raw === 'zh' || raw === 'en') return raw; }
    catch (e) {}
    return 'zh';
  }

  function _tBadge(badge) {
    return _getLang() === 'en' ? { name: badge.nameEn, desc: badge.descEn } : { name: badge.nameZh, desc: badge.descZh };
  }

  function _dateKey(iso) {
    return iso ? iso.slice(0, 10) : '';
  }

  // =====================================================================
  //  Storage helpers
  // =====================================================================
  function _getRecords() {
    if (window.StorageModule && typeof StorageModule.getGameRecords === 'function') {
      // Async in real browser; in Node tests we return sync mock data via get()
      var cached = window.StorageModule.__testRecords;
      if (cached) return cached;
    }
    // Fallback: read from localStorage raw keys (for simple tests)
    try {
      var raw = localStorage.getItem('blindfold_chess_test_records');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function _getCoordinateRecords() {
    if (window.StorageModule && typeof StorageModule.getCoordinateRecords === 'function') {
      var cached = window.StorageModule.__testCoordRecords;
      if (cached) return cached;
    }
    try {
      var raw = localStorage.getItem('blindfold_chess_test_coord_records');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  // =====================================================================
  //  Public API
  // =====================================================================
  const StatsModule = {

    init: function() {
      // Stats screen is built dynamically or assumed present in index.html
      // No-op for now; UI rendering can be added when integrating into index.html
    },

    getGameHistory: function() {
      var recs = _getRecords();
      // Sort by date descending
      return recs.slice().sort(function(a, b) {
        return (b.date || '').localeCompare(a.date || '');
      });
    },

    getWinRate: function(difficulty) {
      var recs = _getRecords();
      var filtered = difficulty ? recs.filter(function(r) { return r.difficulty === difficulty; }) : recs;
      var total = filtered.length;
      if (total === 0) {
        return { total: 0, wins: 0, losses: 0, draws: 0, rate: 0 };
      }
      var wins = 0, losses = 0, draws = 0;
      for (var i = 0; i < filtered.length; i++) {
        var res = filtered[i].result;
        if (res === '1-0') wins++;
        else if (res === '0-1') losses++;
        else if (res === '1/2-1/2') draws++;
      }
      return {
        total: total,
        wins: wins,
        losses: losses,
        draws: draws,
        rate: Math.round((wins / total) * 1000) / 1000
      };
    },

    getProgressData: function() {
      var recs = _getRecords().slice().sort(function(a, b) {
        return (a.date || '').localeCompare(b.date || '');
      });

      var durationTrend = [];
      var movesTrend = [];
      var winRateByDifficulty = { easy: [], medium: [], hard: [], expert: [] };

      var windowSize = 10;
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        // Duration trend: moving average of last N games
        var durWindow = recs.slice(Math.max(0, i - windowSize + 1), i + 1);
        var avgDur = durWindow.reduce(function(s, x) { return s + (x.duration || 0); }, 0) / durWindow.length;
        durationTrend.push({ date: _dateKey(r.date), value: Math.round(avgDur) });

        // Moves trend: moving average of last N games
        var moveWindow = recs.slice(Math.max(0, i - windowSize + 1), i + 1);
        var avgMoves = moveWindow.reduce(function(s, x) { return s + (x.moves || 0); }, 0) / moveWindow.length;
        movesTrend.push({ date: _dateKey(r.date), value: Math.round(avgMoves * 10) / 10 });
      }

      // Win rate by difficulty over time
      var diffs = ['easy', 'medium', 'hard', 'expert'];
      diffs.forEach(function(diff) {
        var diffRecs = recs.filter(function(r) { return r.difficulty === diff; });
        var wins = 0, count = 0;
        for (var j = 0; j < diffRecs.length; j++) {
          count++;
          if (diffRecs[j].result === '1-0') wins++;
          winRateByDifficulty[diff].push({
            date: _dateKey(diffRecs[j].date),
            value: Math.round((wins / count) * 1000) / 1000
          });
        }
      });

      return {
        durationTrend: durationTrend,
        movesTrend: movesTrend,
        winRateByDifficulty: winRateByDifficulty
      };
    },

    exportData: function(format) {
      var recs = _getRecords();
      var coords = _getCoordinateRecords();
      if (format === 'json') {
        var data = {
          exportedAt: new Date().toISOString(),
          gameRecords: recs,
          coordinateRecords: coords,
          winRate: this.getWinRate()
        };
        return JSON.stringify(data, null, 2);
      }
      if (format === 'pgn') {
        return recs.map(function(r) { return r.pgn || ''; }).filter(Boolean).join('\n\n');
      }
      return '';
    },

    clearData: function() {
      // In real usage this would call StorageModule.clearAll()
      // For now we just clear our test fallback keys
      try {
        localStorage.removeItem('blindfold_chess_test_records');
        localStorage.removeItem('blindfold_chess_test_coord_records');
      } catch (e) {}
      if (window.StorageModule && typeof StorageModule.clearAll === 'function') {
        return StorageModule.clearAll();
      }
      return Promise.resolve();
    },

    recordGameResult: function(result) {
      if (!result || typeof result !== 'object') return;
      // In real usage this would call StorageModule.addGameRecord(result)
      // For fallback we append to localStorage test key
      try {
        var raw = localStorage.getItem('blindfold_chess_test_records');
        var recs = raw ? JSON.parse(raw) : [];
        recs.push(result);
        localStorage.setItem('blindfold_chess_test_records', JSON.stringify(recs));
      } catch (e) {}
      if (window.StorageModule && typeof StorageModule.addGameRecord === 'function') {
        return StorageModule.addGameRecord(result);
      }
    },

    getBadges: function() {
      var recs = _getRecords();
      return _badges.map(function(badge) {
        var t = _tBadge(badge);
        return {
          id: badge.id,
          name: t.name,
          description: t.desc,
          unlocked: badge.condition(recs)
        };
      });
    },

    getCoordinateStats: function() {
      var recs = _getCoordinateRecords();
      if (recs.length === 0) {
        return { total: 0, bestScore: 0, avgAccuracy: 0 };
      }
      var best = 0;
      var totalAcc = 0;
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        if (r.score > best) best = r.score;
        totalAcc += (r.accuracy || 0);
      }
      return {
        total: recs.length,
        bestScore: best,
        avgAccuracy: Math.round((totalAcc / recs.length) * 1000) / 1000
      };
    }
  };

  window.StatsModule = StatsModule;
})();
