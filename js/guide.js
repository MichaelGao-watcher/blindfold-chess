(function() {
  'use strict';

  // ── Internal i18n (guide-page only) ──
  const _i18n = {
    en: {
      guideTitle: "Getting Started",
      guideSubtitle: "Pick where you want to begin.",
      guideBasics: "Getting Caught Up",
      guideBasicsDesc: "I have no idea what I'm doing. I need to start from the basics.",
      guidePractice: "Practice",
      guidePracticeDesc: "Jump straight into a practice game against Stockfish.",
      guideExit: "I'm done with it",
      basicsTitle: "Basics",
      basicsSubtitle: "Everything you need to get started.",
      basicsCoords: "Board Coordinates",
      basicsCoordsDesc: "A chessboard has 8 files (columns a–h) and 8 ranks (rows 1–8). Each square is named by its file letter plus rank number, like e4 or d5.",
      basicsNotation: "Algebraic Notation",
      basicsNotationDesc: "Moves are written using algebraic notation: e4 (pawn to e4), Nf3 (knight to f3), O-O (short castle), Qxd5 (queen takes on d5).",
      basicsBlindfold: "Blindfold Chess",
      basicsBlindfoldDesc: "In blindfold chess, you play without seeing the board. You call out moves in notation, and your opponent (or the engine) replies the same way. Keeping the entire position in your mind is the challenge.",
      back: "Back"
    },
    zh: {
      guideTitle: "入门指南",
      guideSubtitle: "选择你想开始的入口。",
      guideBasics: "零基础入门",
      guideBasicsDesc: "我完全不知道怎么下，需要从基础开始。",
      guidePractice: "直接练习",
      guidePracticeDesc: "跳过教学，直接与 Stockfish 对弈。",
      guideExit: "我玩够了",
      basicsTitle: "基础知识",
      basicsSubtitle: "入门所需的一切。",
      basicsCoords: "棋盘坐标",
      basicsCoordsDesc: "棋盘有 8 条纵线（a–h 列）和 8 条横线（1–8 行）。每个格子由其列字母加行数字命名，例如 e4 或 d5。",
      basicsNotation: "代数记谱法",
      basicsNotationDesc: "走法使用代数记谱法书写：e4（兵到 e4）、Nf3（马到 f3）、O-O（短易位）、Qxd5（后在 d5 吃子）。",
      basicsBlindfold: "盲棋",
      basicsBlindfoldDesc: "在盲棋中，你看不到棋盘，用记谱法喊出走法，对手（或引擎）同样回复。在脑海中保持整个局面是挑战所在。",
      back: "返回"
    }
  };

  function _t(key) {
    const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'zh';
    return (_i18n[lang] && _i18n[lang][key]) || (_i18n.en && _i18n.en[key]) || key;
  }

  function _getScreen(id) {
    return document.getElementById(id);
  }

  function _hideScreen(id) {
    const screen = _getScreen(id);
    if (!screen) return false;
    screen.classList.remove('active');
    screen.classList.add('hidden');
    return true;
  }

  function _showScreen(id) {
    const screen = _getScreen(id);
    if (!screen) return false;
    screen.classList.remove('hidden');
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(function() {
        screen.classList.add('active');
      });
    } else {
      screen.classList.add('active');
    }
    return true;
  }

  function _updateGuideTexts() {
    const guideScreen = _getScreen('guideScreen');
    const basicsScreen = _getScreen('basicsScreen');
    const scopes = [];
    if (guideScreen) scopes.push(guideScreen);
    if (basicsScreen) scopes.push(basicsScreen);

    scopes.forEach(function(scope) {
      const elements = scope.querySelectorAll('[data-i18n]');
      elements.forEach(function(el) {
        const key = el.getAttribute('data-i18n');
        if (_i18n.en[key] || _i18n.zh[key]) {
          if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
            el.placeholder = _t(key);
          } else {
            el.textContent = _t(key);
          }
        }
      });
    });
  }

  function _exitApp() {
    if (typeof window !== 'undefined') {
      try { window.close(); } catch (e) { /* ignore */ }
      if (window.location && typeof window.location.href === 'string') {
        window.location.href = 'about:blank';
      }
    }
  }

  // ── Module object ──
  const GuideModule = {
    init: function() {
      const guideScreen = _getScreen('guideScreen');
      const basicsScreen = _getScreen('basicsScreen');

      if (guideScreen) {
        const guideBack = guideScreen.querySelector('.back-btn');
        if (guideBack) {
          guideBack.addEventListener('click', function() {
            GuideModule.showSection('start');
          });
        }

        const cards = guideScreen.querySelectorAll('.mode-card');
        if (cards.length > 0) {
          cards[0].addEventListener('click', function() {
            GuideModule.showSection('basics');
          });
        }
        if (cards.length > 1) {
          cards[1].addEventListener('click', function() {
            GuideModule.showSection('difficulty');
          });
        }
        if (cards.length > 2) {
          cards[2].addEventListener('click', function() {
            _exitApp();
          });
        }
      }

      if (basicsScreen) {
        const basicsBack = basicsScreen.querySelector('.back-btn');
        if (basicsBack) {
          basicsBack.addEventListener('click', function() {
            GuideModule.showSection('menu');
          });
        }
      }
    },

    showSection: function(id) {
      switch (id) {
        case 'menu':
        case 'guide':
          _hideScreen('basicsScreen');
          _hideScreen('startScreen');
          _showScreen('guideScreen');
          _updateGuideTexts();
          return true;
        case 'basics':
          _hideScreen('guideScreen');
          _hideScreen('startScreen');
          _showScreen('basicsScreen');
          _updateGuideTexts();
          return true;
        case 'start':
          _hideScreen('guideScreen');
          _hideScreen('basicsScreen');
          _showScreen('startScreen');
          return true;
        case 'difficulty':
          _hideScreen('guideScreen');
          _hideScreen('basicsScreen');
          _hideScreen('startScreen');
          _showScreen('difficultyScreen');
          return true;
        default:
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('GuideModule: unknown section', id);
          }
          return false;
      }
    }
  };

  window.GuideModule = GuideModule;
})();
