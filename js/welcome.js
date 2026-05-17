(function() {
  'use strict';

  // ── Internal i18n (welcome-page only) ──
  const _i18n = {
    en: {
      tagline: "Play chess without seeing the board.",
      modeBlindfold: "Blindfold Practice",
      modeBlindfoldDesc: "Practice blindfold chess against the Stockfish engine at your chosen level.",
      modeCoordinate: "Coordinate Practice",
      modeCoordinateDesc: "Train your board vision by identifying squares and calling out coordinates.",
      modeGuide: "Wait. I don't even know how…",
      modeGuideDesc: "it's fine. Try this",
      modeReplay: "Blindfold Replay",
      modeReplayDesc: "Review classic games and practice blindfold replay.",
      tapMode: "Tap a mode to begin",
      back: "Back"
    },
    zh: {
      tagline: "不看棋盘，心算对弈。",
      modeBlindfold: "盲棋练习",
      modeBlindfoldDesc: "选择难度，与 Stockfish 引擎进行盲棋对弈。",
      modeCoordinate: "坐标练习",
      modeCoordinateDesc: "训练你的棋盘视觉，识别格子并喊出坐标。",
      modeGuide: "等等，我根本不会…",
      modeGuideDesc: "没关系，从这里开始",
      modeReplay: "盲棋复盘",
      modeReplayDesc: "回顾经典对局，练习盲棋推演。",
      tapMode: "点击模式开始",
      back: "返回"
    }
  };

  function _t(key) {
    const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'zh';
    return (_i18n[lang] && _i18n[lang][key]) || (_i18n.en && _i18n.en[key]) || key;
  }

  // ── Screen transition helpers ──
  function _getScreen(id) {
    return document.getElementById(id);
  }

  function _hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(function(s) {
      s.classList.remove('active');
      s.classList.add('hidden');
    });
  }

  function _showScreen(id) {
    const screen = _getScreen(id);
    if (!screen) return false;
    _hideAllScreens();
    screen.classList.remove('hidden');
    requestAnimationFrame(function() {
      screen.classList.add('active');
    });
    return true;
  }

  function _hideScreen(id) {
    const screen = _getScreen(id);
    if (!screen) return false;
    screen.classList.remove('active');
    screen.classList.add('hidden');
    return true;
  }

  // ── Dynamic background & entrance animation ──
  let _bgFrameId = null;

  function _isLowEndDevice() {
    try {
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return true;
      if (navigator.deviceMemory && navigator.deviceMemory <= 2) return true;
      // iOS 12 and below or very old Android
      const ua = navigator.userAgent || '';
      if (/iPhone OS [789]_/.test(ua) || /Android [456]\./.test(ua)) return true;
    } catch (e) {
      // If APIs are missing, assume low-end to be safe
      return true;
    }
    return false;
  }

  function _startBackgroundEffect() {
    const container = _getScreen('startScreen');
    if (!container) return;

    if (_isLowEndDevice()) {
      container.classList.remove('animated-bg');
      container.classList.add('low-end');
      return; // Performance fallback: skip canvas/gradient animation
    }

    container.classList.remove('low-end');
    container.classList.add('animated-bg');

    // Simple CSS-class-driven animation; no canvas loop needed.
    // If we ever add a canvas loop, it would go here and use _bgFrameId.
  }

  function _stopBackgroundEffect() {
    const container = _getScreen('startScreen');
    if (container) {
      container.classList.remove('animated-bg');
      container.classList.remove('low-end');
    }
    if (_bgFrameId) {
      cancelAnimationFrame(_bgFrameId);
      _bgFrameId = null;
    }
  }

  function _playEntranceAnimation() {
    const cards = document.querySelectorAll('#startScreen .mode-card');
    cards.forEach(function(card, idx) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      // Stagger delay: 100ms base + 80ms per card
      var delay = 100 + idx * 80;
      setTimeout(function() {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, delay);
    });
  }

  // ── Event binding ──
  function _bindCard(id, mode) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function() {
      WelcomeModule.navigateTo(mode);
    });
  }

  // ── Module object ──
  const WelcomeModule = {
    init: function() {
      if (!_getScreen('startScreen')) return;

      _bindCard('modeBlindfold', 'blindfold');
      _bindCard('modeCoordinate', 'coordinate');
      _bindCard('modeGuide', 'guide');
      _bindCard('modeReplay', 'replay');

      _startBackgroundEffect();
      _playEntranceAnimation();
    },

    navigateTo: function(mode) {
      if (typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.setItem('lastMode', mode);
        } catch (e) {
          // Ignore quota exceeded
        }
      }

      switch (mode) {
        case 'blindfold':
          _showScreen('difficultyScreen');
          break;
        case 'coordinate':
          _showScreen('coordinateScreen');
          break;
        case 'guide':
          _showScreen('guideScreen');
          break;
        case 'replay':
          // Replay screen does not exist yet (planned in batch 4).
          // We hide the welcome screen so a future ReplayModule can show itself.
          _hideScreen('startScreen');
          break;
        default:
          // eslint-disable-next-line no-console
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('WelcomeModule: unknown mode', mode);
          }
      }
    }
  };

  window.WelcomeModule = WelcomeModule;
})();
