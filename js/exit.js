(function() {
  'use strict';

  if (typeof window === 'undefined') global.window = global;

  // =====================================================================
  //  Internal state
  // =====================================================================
  const _lines = [
    { zh: '这对我来说太难了，我要去打开 TikTok 放松一下',
      en: 'This is too hard for me. I\'m going to open TikTok and relax.' },
    { zh: '一代天才，就此陨落',
      en: 'A brilliant mind, fallen just like that.' },
    { zh: '棋局未终，人已先撤',
      en: 'The game goes on, but I\'m out.' },
    { zh: '我的大脑需要重启一下',
      en: 'My brain needs a reboot.' },
    { zh: '下次我一定记得开局怎么走',
      en: 'Next time I\'ll definitely remember the opening.' },
    { zh: '这不是认输，这是战略性撤退',
      en: 'This is not resignation, it\'s a strategic retreat.' },
    { zh: '我去喝杯咖啡，回来再战',
      en: 'I\'m getting coffee. Be right back.' },
    { zh: '棋如人生，有时候需要暂停',
      en: 'Chess is like life — sometimes you need to pause.' },
    { zh: '我的棋子们需要休息一下',
      en: 'My pieces need a break.' },
    { zh: '这不是结束，这是中场休息',
      en: 'This is not the end, it\'s halftime.' }
  ];

  let _lastIndex = -1;

  // =====================================================================
  //  Helpers
  // =====================================================================
  function _getLang() {
    if (window.SettingsModule && typeof SettingsModule.get === 'function') {
      var lang = SettingsModule.get('lang');
      if (lang === 'zh' || lang === 'en') return lang;
    }
    // Fallback to common.js localStorage key
    try {
      var raw = localStorage.getItem('lang');
      if (raw === 'zh' || raw === 'en') return raw;
    } catch (e) {}
    return 'zh';
  }

  function _getScreen(id) {
    return document.getElementById(id);
  }

  function _hideAllScreens() {
    document.querySelectorAll('.screen').forEach(function(el) {
      el.classList.remove('active');
      el.classList.add('hidden');
    });
  }

  function _showScreen(id) {
    var el = _getScreen(id);
    if (!el) return;
    _hideAllScreens();
    el.classList.remove('hidden');
    requestAnimationFrame(function() {
      el.classList.add('active');
    });
  }

  // =====================================================================
  //  Build exit screen content dynamically
  // =====================================================================
  function _buildExitScreen() {
    var screen = _getScreen('exitScreen');
    if (!screen) return;

    // Clear existing content to avoid duplicates on re-init
    var brand = screen.querySelector('.brand');
    if (!brand) {
      brand = document.createElement('div');
      brand.className = 'brand';
      screen.appendChild(brand);
    }
    brand.innerHTML = '';

    var title = document.createElement('h1');
    title.setAttribute('data-i18n', 'exitTitle');
    title.textContent = _getLang() === 'en' ? 'See you next time!' : '下次见！';
    brand.appendChild(title);

    var lineEl = document.createElement('p');
    lineEl.id = 'exitLine';
    lineEl.style.cssText = 'font-size:1.15rem;color:var(--text-secondary);font-style:italic;max-width:320px;line-height:1.6;margin-top:0.5rem;';
    lineEl.textContent = ExitModule.getRandomLine();
    brand.appendChild(lineEl);

    var actions = document.createElement('div');
    actions.className = 'game-actions';
    actions.style.cssText = 'margin-top:1.5rem;gap:0.8rem;';

    var againBtn = document.createElement('button');
    againBtn.id = 'exitAgainBtn';
    againBtn.textContent = _getLang() === 'en' ? 'Play Again' : '再玩一局';
    againBtn.addEventListener('click', function() {
      if (window.WelcomeModule && typeof WelcomeModule.navigateTo === 'function') {
        WelcomeModule.navigateTo('blindfold');
      } else {
        _showScreen('startScreen');
      }
    });

    var confirmBtn = document.createElement('button');
    confirmBtn.id = 'exitConfirmBtn';
    confirmBtn.style.cssText = 'background:var(--surface);color:var(--text-primary);';
    confirmBtn.textContent = _getLang() === 'en' ? 'Close Tab' : '关闭页面';
    confirmBtn.addEventListener('click', function() {
      window.close();
      window.location.href = 'about:blank';
    });

    actions.appendChild(againBtn);
    actions.appendChild(confirmBtn);
    brand.appendChild(actions);
  }

  // =====================================================================
  //  Public API
  // =====================================================================
  const ExitModule = {
    init: function() {
      if (typeof document === 'undefined') return;
      _buildExitScreen();
    },

    showExitScreen: function() {
      if (typeof document === 'undefined') return;
      _buildExitScreen();
      _showScreen('exitScreen');
    },

    getRandomLine: function() {
      var lang = _getLang();
      var idx;
      if (_lines.length <= 1) {
        idx = 0;
      } else {
        do {
          idx = Math.floor(Math.random() * _lines.length);
        } while (idx === _lastIndex);
      }
      _lastIndex = idx;
      return _lines[idx][lang] || _lines[idx].zh;
    }
  };

  window.ExitModule = ExitModule;
})();
