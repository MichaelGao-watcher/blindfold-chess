(function() {
  'use strict';

  // Initialize new modules (from batch 2 & 3)
  if (window.WelcomeModule && typeof WelcomeModule.init === 'function') {
    WelcomeModule.init();
  }
  if (window.GuideModule && typeof GuideModule.init === 'function') {
    GuideModule.init();
  }
  if (window.CoordinateModule && typeof CoordinateModule.init === 'function') {
    CoordinateModule.init();
  }
  if (window.SettingsModule && typeof SettingsModule.init === 'function') {
    SettingsModule.init();
  }

  // Batch 4 modules
  if (window.ExitModule && typeof ExitModule.init === 'function') {
    ExitModule.init();
  }
  if (window.StatsModule && typeof StatsModule.init === 'function') {
    StatsModule.init();
  }
  if (window.ReplayModule && typeof ReplayModule.init === 'function') {
    ReplayModule.init();
  }

  // Legacy: global text update (from common.js)
  if (typeof updateTexts === 'function') {
    updateTexts();
  }

  // Blindfold game: Enter key submits move
  const moveInput = document.getElementById('moveInput');
  if (moveInput) {
    moveInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && window.BlindfoldModule) {
        BlindfoldModule.submitMove(moveInput.value);
      }
    });
  }

  // Coordinate practice: Enter key submits answer
  const coordInput = document.getElementById('coordInput');
  if (coordInput) {
    coordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && window.CoordinateModule) {
        CoordinateModule.submitAnswer(coordInput.value);
      }
    });
  }
})();
