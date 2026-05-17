(function() {
  'use strict';

  if (typeof window === 'undefined') global.window = global;

  // =====================================================================
  //  Internal state
  // =====================================================================
  const _defaults = {
    theme: 'dark',
    lang: 'zh',
    sound: true,
    engineConfig: { elo: 1200, depth: 15, multiPv: false },
    showHints: false
  };

  const _settings = {};
  const _changeCallbacks = [];

  // =====================================================================
  //  i18n dictionary (settings-specific labels)
  // =====================================================================
  const _i18n = {
    en: {
      soundLabel: 'Sound',
      soundOn: 'On',
      soundOff: 'Off',
      eloLabel: 'Elo',
      depthLabel: 'Depth',
      multiPvLabel: 'Analysis',
      showHintsLabel: 'Hints',
      themeDark: 'Dark mode',
      themeLight: 'Light mode'
    },
    zh: {
      soundLabel: '音效',
      soundOn: '开',
      soundOff: '关',
      eloLabel: '等级分',
      depthLabel: '深度',
      multiPvLabel: '多线分析',
      showHintsLabel: '走法建议',
      themeDark: '深色模式',
      themeLight: '浅色模式'
    }
  };

  function _t(key) {
    const lang = _settings.lang || 'zh';
    const dict = _i18n[lang] || _i18n.zh;
    return dict[key] || key;
  }

  // =====================================================================
  //  Persistence helpers
  // =====================================================================
  function _load(key) {
    if (window.StorageModule && typeof StorageModule.get === 'function') {
      return StorageModule.get(key);
    }
    try {
      const raw = localStorage.getItem('blindfold_chess_' + key);
      return raw !== null ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function _save(key, value) {
    _settings[key] = value;
    if (window.StorageModule && typeof StorageModule.set === 'function') {
      StorageModule.set(key, value);
    } else {
      try {
        localStorage.setItem('blindfold_chess_' + key, JSON.stringify(value));
      } catch (e) {
        // ignore quota errors in tests
      }
    }
    // Backward compatibility with common.js (which reads raw localStorage keys)
    if (key === 'lang' || key === 'theme') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {}
    }
    _changeCallbacks.forEach(function(cb) {
      try { cb(key, value); } catch (e) {}
    });
  }

  // =====================================================================
  //  UI update helpers
  // =====================================================================
  function _updateThemeIcon(theme) {
    const sun = document.getElementById('panelIconSun');
    const moon = document.getElementById('panelIconMoon');
    if (sun && moon) {
      sun.style.display = theme === 'light' ? 'block' : 'none';
      moon.style.display = theme === 'dark' ? 'block' : 'none';
    }
    const label = document.getElementById('themeLabelText');
    if (label) {
      label.textContent = theme === 'dark' ? _t('themeDark') : _t('themeLight');
    }
  }

  function _updateLangValue() {
    const el = document.getElementById('langValue');
    if (!el) return;
    el.textContent = _settings.lang === 'en' ? 'English' : '中文';
  }

  function _updateSoundValue() {
    const el = document.getElementById('soundValue');
    if (el) el.textContent = _settings.sound ? _t('soundOn') : _t('soundOff');
  }

  function _updateEloValue() {
    const el = document.getElementById('eloValue');
    const slider = document.getElementById('eloSlider');
    if (el) el.textContent = _settings.engineConfig.elo;
    if (slider) slider.value = _settings.engineConfig.elo;
  }

  function _updateDepthValue() {
    const el = document.getElementById('depthValue');
    const slider = document.getElementById('depthSlider');
    if (el) el.textContent = _settings.engineConfig.depth;
    if (slider) slider.value = _settings.engineConfig.depth;
  }

  function _updateMultiPvValue() {
    const el = document.getElementById('multiPvValue');
    if (el) el.textContent = _settings.engineConfig.multiPv ? _t('soundOn') : _t('soundOff');
  }

  function _updateShowHintsValue() {
    const el = document.getElementById('showHintsValue');
    if (el) el.textContent = _settings.showHints ? _t('soundOn') : _t('soundOff');
  }

  function _updateAllTexts() {
    _updateThemeIcon(_settings.theme);
    _updateLangValue();
    _updateSoundValue();
    _updateEloValue();
    _updateDepthValue();
    _updateMultiPvValue();
    _updateShowHintsValue();
    if (typeof window.updateTexts === 'function') {
      window.updateTexts();
    }
  }

  // =====================================================================
  //  Element binding helper (removes old listeners via clone + replace)
  // =====================================================================
  function _rebind(id, eventType, handler) {
    eventType = eventType || 'click';
    const el = document.getElementById(id);
    if (!el || !el.parentNode) return null;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    if (handler) clone.addEventListener(eventType, handler);
    return clone;
  }

  // =====================================================================
  //  Public API
  // =====================================================================
  const SettingsModule = {
    init: function() {
      if (typeof document === 'undefined') return;

      // Load persisted settings
      var savedTheme = _load('theme');
      _settings.theme = (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : _defaults.theme;

      var savedLang = _load('lang');
      _settings.lang = (savedLang === 'zh' || savedLang === 'en') ? savedLang : _defaults.lang;

      var savedSound = _load('sound');
      _settings.sound = (typeof savedSound === 'boolean') ? savedSound : _defaults.sound;

      var savedHints = _load('showHints');
      _settings.showHints = (typeof savedHints === 'boolean') ? savedHints : _defaults.showHints;

      var savedEngine = _load('engineConfig');
      if (savedEngine && typeof savedEngine === 'object' && !Array.isArray(savedEngine)) {
        _settings.engineConfig = {
          elo: typeof savedEngine.elo === 'number' ? savedEngine.elo : _defaults.engineConfig.elo,
          depth: typeof savedEngine.depth === 'number' ? savedEngine.depth : _defaults.engineConfig.depth,
          multiPv: typeof savedEngine.multiPv === 'boolean' ? savedEngine.multiPv : _defaults.engineConfig.multiPv
        };
      } else {
        _settings.engineConfig = { ..._defaults.engineConfig };
      }

      // Apply to document
      document.documentElement.setAttribute('data-theme', _settings.theme);
      if (document.documentElement.lang !== undefined) {
        document.documentElement.lang = _settings.lang === 'en' ? 'en' : 'zh-CN';
      }

      // Ensure panel is closed on init
      var panel = document.getElementById('settingsPanel');
      if (panel) panel.classList.remove('show');

      // Re-bind theme toggle (replaces common.js listeners)
      _rebind('themeSetting', 'click', function() {
        var next = _settings.theme === 'dark' ? 'light' : 'dark';
        SettingsModule.setTheme(next);
      });

      // Re-bind language toggle
      _rebind('langSetting', 'click', function() {
        var next = _settings.lang === 'en' ? 'zh' : 'en';
        SettingsModule.setLanguage(next);
      });

      // Bind sound toggle (fresh element to avoid duplicate listeners)
      _rebind('soundSetting', 'click', function() {
        SettingsModule.setSound(!_settings.sound);
      });

      // Bind showHints toggle
      _rebind('showHintsSetting', 'click', function() {
        _settings.showHints = !_settings.showHints;
        _save('showHints', _settings.showHints);
        _updateShowHintsValue();
      });

      // Bind engine config controls
      _rebind('eloSlider', 'input', function(e) {
        var val = parseInt(e.target.value, 10);
        SettingsModule.setEngineConfig({ elo: val });
      });

      _rebind('depthSlider', 'input', function(e) {
        var val = parseInt(e.target.value, 10);
        SettingsModule.setEngineConfig({ depth: val });
      });

      _rebind('multiPvSetting', 'click', function() {
        SettingsModule.setEngineConfig({ multiPv: !_settings.engineConfig.multiPv });
      });

      // Panel toggle (rebind to remove common.js listeners)
      var newToggle = _rebind('settingsToggle', 'click', function(e) {
        if (e && e.stopPropagation) e.stopPropagation();
        if (panel) panel.classList.toggle('show');
      });

      // Click outside to close
      document.addEventListener('click', function(e) {
        if (!panel) return;
        var target = e.target;
        if (!panel.contains(target) && target !== newToggle) {
          panel.classList.remove('show');
        }
      });

      _updateAllTexts();
    },

    setTheme: function(theme) {
      if (theme !== 'dark' && theme !== 'light') return;
      _settings.theme = theme;
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.setAttribute('data-theme', theme);
      }
      _save('theme', theme);
      _updateThemeIcon(theme);
    },

    setLanguage: function(lang) {
      if (lang !== 'zh' && lang !== 'en') return;
      _settings.lang = lang;
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
      }
      _save('lang', lang);
      _updateAllTexts();
    },

    setSound: function(enabled) {
      _settings.sound = !!enabled;
      _save('sound', _settings.sound);
      _updateSoundValue();
    },

    setEngineConfig: function(config) {
      if (!config || typeof config !== 'object') return;
      var cfg = {
        elo: _settings.engineConfig.elo,
        depth: _settings.engineConfig.depth,
        multiPv: _settings.engineConfig.multiPv
      };
      if (typeof config.elo === 'number') {
        cfg.elo = Math.max(400, Math.min(3200, config.elo));
      }
      if (typeof config.depth === 'number') {
        cfg.depth = Math.max(1, Math.min(30, config.depth));
      }
      if (typeof config.multiPv === 'boolean') {
        cfg.multiPv = config.multiPv;
      }
      _settings.engineConfig = cfg;
      _save('engineConfig', cfg);
      _updateEloValue();
      _updateDepthValue();
      _updateMultiPvValue();
    },

    get: function(key) {
      if (key in _settings) return _settings[key];
      return _load(key);
    },

    // Internal helper for integration tests / cross-module communication
    _onChange: function(callback) {
      if (typeof callback === 'function') {
        _changeCallbacks.push(callback);
      }
    }
  };

  window.SettingsModule = SettingsModule;
})();
