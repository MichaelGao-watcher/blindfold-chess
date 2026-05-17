(function() {
  'use strict';

  // Initialize new modules (from batch 2)
  if (window.WelcomeModule && typeof WelcomeModule.init === 'function') {
    WelcomeModule.init();
  }
  if (window.GuideModule && typeof GuideModule.init === 'function') {
    GuideModule.init();
  }
  if (window.CoordinateModule && typeof CoordinateModule.init === 'function') {
    CoordinateModule.init();
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
