(function() {
  'use strict';

  // =====================================================================
  //  Internal state
  // =====================================================================

  const _lines = [
    {
      zh: '这对我来说太难了，我要去打开 TikTok 放松一下',
      en: "This is too hard for me. I'm going to open TikTok and relax."
    },
    {
      zh: '一代天才，就此陨落',
      en: 'A brilliant mind, fallen just like that.'
    },
    {
      zh: '我的棋子刚才集体辞职了，说压力太大',
      en: 'My pieces just resigned collectively. Too much pressure.'
    },
    {
      zh: '大脑内存不足，请关闭部分脑细胞再试',
      en: 'Brain memory insufficient. Please close some neurons and try again.'
    },
    {
      zh: '棋手未老，棋先丢，盲棋不易，且行且珍惜',
      en: 'The player is not old, but the pieces are lost. Blindfold chess is hard—cherish every move.'
    },
    {
      zh: '此局太虐，朕要退朝了',
      en: 'This game is too brutal. His Majesty is leaving the court.'
    },
    {
      zh: '我的盲棋生涯，始于雄心，终于失忆',
      en: 'My blindfold career began with ambition, ended with amnesia.'
    },
    {
      zh: '对方一定开了挂，我要下线去举报',
      en: "The opponent must be cheating. I'm logging off to report them."
    },
    {
      zh: '我只是在测试浏览器的关闭按钮灵不灵',
      en: "I'm just testing if the browser close button works."
    },
    {
      zh: '棋输人不输，TikTok 不能不看',
      en: 'Lost the game, not my dignity. TikTok is waiting.'
    },
    {
      zh: '看来我的脑内棋盘需要系统维护了',
      en: 'Looks like my mental chessboard needs system maintenance.'
    },
    {
      zh: '这不是退出，这是战略性转移',
      en: "This isn't quitting. It's a strategic retreat."
    }
  ];

  let _lastIndex = -1;
  let _initialized = false;
  let _typewriterTimer = null;

  // =====================================================================
  //  Helpers
  // =====================================================================

  function _getLang() {
    if (window.SettingsModule && typeof SettingsModule.get === 'function') {
      const lang = SettingsModule.get('lang');
      if (lang === 'zh' || lang === 'en') return lang;
    }
    return 'zh';
  }

  function _hideAllScreens() {
    if (typeof document === 'undefined') return;
    const screens = document.querySelectorAll('.screen');
    screens.forEach(function(s) {
      s.classList.remove('active');
      s.classList.add('hidden');
    });
  }

  function _showScreen(id) {
    if (typeof document === 'undefined') return false;
    const screen = document.getElementById(id);
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

  function _clearTypewriter() {
    if (_typewriterTimer !== null) {
      clearTimeout(_typewriterTimer);
      _typewriterTimer = null;
    }
  }

  function _startTypewriter(el, text, speed) {
    _clearTypewriter();
    if (!ExitModule._typewriterEnabled) {
      el.textContent = text;
      return;
    }
    var i = 0;
    el.textContent = '';
    function typeNext() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        _typewriterTimer = setTimeout(typeNext, speed);
      } else {
        _typewriterTimer = null;
      }
    }
    typeNext();
  }

  function _buildExitScreen() {
    if (typeof document === 'undefined') return;
    const screen = document.getElementById('exitScreen');
    if (!screen) return;

    // Prevent double-build
    if (screen.querySelector('.exit-humor-line')) return;

    const brand = screen.querySelector('.brand');
    if (!brand) return;

    // Humor line
    const lineEl = document.createElement('p');
    lineEl.className = 'exit-humor-line';
    lineEl.style.cssText =
      'font-size:1.25rem;font-weight:500;color:var(--text-secondary);' +
      'margin:1.2rem auto 2rem;max-width:480px;text-align:center;line-height:1.6;min-height:2em;';
    brand.appendChild(lineEl);

    // Button row
    const btnWrap = document.createElement('div');
    btnWrap.className = 'exit-actions';
    btnWrap.style.cssText = 'display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;';

    // Secondary — confirm exit
    const confirmBtn = document.createElement('button');
    confirmBtn.id = 'exitConfirmBtn';
    confirmBtn.className = 'exit-btn exit-btn-secondary';
    confirmBtn.style.cssText =
      'padding:0.7rem 1.6rem;border-radius:12px;border:1px solid var(--border);' +
      'background:rgba(255,255,255,0.08);color:var(--text-primary);font-size:1rem;' +
      'font-family:inherit;cursor:pointer;backdrop-filter:blur(8px);' +
      'transition:transform 0.15s ease, background 0.15s ease;';
    confirmBtn.addEventListener('mouseenter', function() {
      confirmBtn.style.background = 'rgba(255,255,255,0.14)';
    });
    confirmBtn.addEventListener('mouseleave', function() {
      confirmBtn.style.background = 'rgba(255,255,255,0.08)';
    });
    confirmBtn.addEventListener('click', function() {
      try { window.close(); } catch (e) { /* ignore */ }
      if (window.location && typeof window.location.href === 'string') {
        window.location.href = 'about:blank';
      }
    });
    btnWrap.appendChild(confirmBtn);

    // Primary — play again
    const againBtn = document.createElement('button');
    againBtn.id = 'exitAgainBtn';
    againBtn.className = 'exit-btn exit-btn-primary';
    againBtn.style.cssText =
      'padding:0.7rem 1.6rem;border-radius:12px;border:none;' +
      'background:var(--accent);color:#fff;font-size:1rem;' +
      'font-family:inherit;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.25);' +
      'transition:transform 0.15s ease, box-shadow 0.15s ease;';
    againBtn.addEventListener('mouseenter', function() {
      againBtn.style.transform = 'translateY(-1px)';
      againBtn.style.boxShadow = '0 6px 18px rgba(0,0,0,0.3)';
    });
    againBtn.addEventListener('mouseleave', function() {
      againBtn.style.transform = 'translateY(0)';
      againBtn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
    });
    againBtn.addEventListener('click', function() {
      if (window.WelcomeModule && typeof WelcomeModule.navigateTo === 'function') {
        WelcomeModule.navigateTo('blindfold');
      } else {
        _hideAllScreens();
        var start = document.getElementById('startScreen');
        if (start) {
          start.classList.remove('hidden');
          start.classList.add('active');
        }
      }
    });
    btnWrap.appendChild(againBtn);

    brand.appendChild(btnWrap);
  }

  function _updateButtonLabels() {
    if (typeof document === 'undefined') return;
    const lang = _getLang();
    var confirmBtn = document.getElementById('exitConfirmBtn');
    var againBtn = document.getElementById('exitAgainBtn');
    if (confirmBtn) confirmBtn.textContent = lang === 'en' ? 'Confirm Exit' : '确认退出';
    if (againBtn) againBtn.textContent = lang === 'en' ? 'Play Again' : '再玩一局';
  }

  // =====================================================================
  //  Public API
  // =====================================================================

  const ExitModule = {
    _typewriterEnabled: true,

    init: function() {
      if (typeof document === 'undefined') return;
      _buildExitScreen();
      _updateButtonLabels();
      _initialized = true;
    },

    showExitScreen: function() {
      if (typeof document === 'undefined') return;
      _buildExitScreen();

      var line = ExitModule.getRandomLine();
      var screen = document.getElementById('exitScreen');
      var lineEl = screen ? screen.querySelector('.exit-humor-line') : null;
      if (lineEl) {
        _clearTypewriter();
        lineEl.textContent = '';
        lineEl.style.opacity = '0';
        lineEl.style.transition = 'opacity 0.4s ease';
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(function() {
            lineEl.style.opacity = '1';
            _startTypewriter(lineEl, line, 30);
          });
        } else {
          lineEl.style.opacity = '1';
          _startTypewriter(lineEl, line, 30);
        }
      }

      _updateButtonLabels();
      _hideAllScreens();
      _showScreen('exitScreen');
    },

    getRandomLine: function() {
      var lang = _getLang();
      var idx;
      if (_lines.length > 1) {
        do {
          idx = Math.floor(Math.random() * _lines.length);
        } while (idx === _lastIndex);
      } else {
        idx = 0;
      }
      _lastIndex = idx;
      return _lines[idx][lang] || _lines[idx].zh;
    }
  };

  window.ExitModule = ExitModule;
})();
