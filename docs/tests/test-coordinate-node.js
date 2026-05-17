// Node.js test runner for CoordinateModule
// Usage: node docs/tests/test-coordinate-node.js

'use strict';

const path = require('path');

// 1. Load TestRunner
require('../../js/test-runner.js');

// 2. Load board-renderer.js for its DOM mock
require('../../js/board-renderer.js');

// Polyfill requestAnimationFrame for Node.js
if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = function(cb) { return setTimeout(cb, 16); };
}
if (typeof cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = function(id) { clearTimeout(id); };
}

// Speed up the 600ms correct-answer delay in tests
const _origSetTimeout = global.setTimeout;
global.setTimeout = function(cb, delay) {
  var args = Array.prototype.slice.call(arguments, 2);
  if (delay === 600) return _origSetTimeout.apply(this, [cb, 0].concat(args));
  return _origSetTimeout.apply(this, [cb, delay].concat(args));
};

// 3. Build mock DOM structure
function createEl(tag, opts) {
  opts = opts || {};
  const el = document.createElement(tag);
  if (opts.id) {
    el.id = opts.id;
    document._mockRegister(opts.id, el);
  }
  if (opts.className) el.className = opts.className;
  if (opts.text) el.textContent = opts.text;
  if (opts.parent) opts.parent.appendChild(el);
  return el;
}

const startScreen = createEl('div', { id: 'startScreen', className: 'screen hidden' });
document.body.appendChild(startScreen);

const coordinateScreen = createEl('div', { id: 'coordinateScreen', className: 'screen hidden' });
document.body.appendChild(coordinateScreen);

const backBtn = createEl('button', { className: 'back-btn', parent: coordinateScreen });
createEl('span', { text: 'Back', parent: backBtn });

createEl('div', { id: 'coordScore', parent: coordinateScreen });
createEl('div', { id: 'coordPrompt', parent: coordinateScreen });
createEl('div', { id: 'coordTimer', parent: coordinateScreen });

const boardWrapper = createEl('div', { id: 'coordinateBoardWrapper', className: 'board-wrapper', parent: coordinateScreen });
createEl('div', { className: 'board-row-labels', parent: boardWrapper });
const boardArea = createEl('div', { className: 'board-area', parent: boardWrapper });
createEl('div', { id: 'coordinateBoardGrid', className: 'board-grid', parent: boardArea });
createEl('div', { className: 'board-col-labels', parent: boardArea });

const inputArea = createEl('div', { id: 'coordInputArea', parent: coordinateScreen });
createEl('input', { id: 'coordInput', parent: inputArea });
createEl('button', { id: 'coordInputGoBtn', parent: inputArea });

createEl('div', { id: 'coordFeedback', parent: coordinateScreen });

const setupActions = createEl('div', { id: 'coordSetupActions', className: 'game-actions', parent: coordinateScreen });
createEl('button', { text: 'Play as White', parent: setupActions });
setupActions.children[0].setAttribute('data-i18n', 'playAsWhite');
createEl('button', { text: 'Play as Black', parent: setupActions });
setupActions.children[1].setAttribute('data-i18n', 'playAsBlack');

const timerPresets = createEl('div', { id: 'coordTimerPresets', className: 'game-actions', parent: coordinateScreen });
createEl('button', { id: 'coordTimer30', text: '30s', parent: timerPresets });
createEl('button', { id: 'coordTimer60', text: '60s', parent: timerPresets });
createEl('button', { id: 'coordTimer120', text: '120s', parent: timerPresets });
createEl('button', { id: 'coordTimer0', text: '∞', parent: timerPresets });

const modeActions = createEl('div', { id: 'coordModeActions', className: 'game-actions', parent: coordinateScreen });
createEl('button', { id: 'btnModeA', text: 'Mode A', parent: modeActions });
createEl('button', { id: 'btnModeB', text: 'Mode B', parent: modeActions });

const resultOverlay = createEl('div', { id: 'coordResultOverlay', className: 'result-overlay', parent: coordinateScreen });
const resultCard = createEl('div', { className: 'result-card', parent: resultOverlay });
createEl('div', { id: 'coordResultTitle', parent: resultCard });
createEl('div', { id: 'coordResultMsg', parent: resultCard });
createEl('button', { id: 'coordRestartBtn', text: 'Again', parent: resultCard });
createEl('button', { id: 'coordBackBtn', text: 'Back', parent: resultCard });

// Mock StorageModule
global.StorageModule = {
  _records: [],
  addCoordinateRecord: function(record) {
    this._records.push(JSON.parse(JSON.stringify(record)));
  }
};

// 4. Load the module under test
require('../../js/coordinate.js');

// 5. Helpers
function readTargetFromPrompt() {
  const promptEl = document.getElementById('coordPrompt');
  const text = promptEl ? promptEl.textContent : '';
  const parts = text.trim().split(/\s+/);
  return parts.length > 0 ? parts[parts.length - 1].toLowerCase() : null;
}

function readTargetFromHighlight() {
  const grid = document.getElementById('coordinateBoardGrid');
  if (!grid) return null;
  const squares = grid.querySelectorAll('.square');
  for (let i = 0; i < squares.length; i++) {
    if (squares[i].classList.contains('glass-highlight')) {
      return squares[i].getAttribute('data-square');
    }
  }
  return null;
}

// 6. Tests
TestRunner.suite('CoordinateModule', function() {

  TestRunner.test('CM-01: exposes required public methods', function() {
    TestRunner.assert(typeof CoordinateModule.init === 'function', 'init missing');
    TestRunner.assert(typeof CoordinateModule.startPractice === 'function', 'startPractice missing');
    TestRunner.assert(typeof CoordinateModule.setTimer === 'function', 'setTimer missing');
    TestRunner.assert(typeof CoordinateModule.submitAnswer === 'function', 'submitAnswer missing');
    TestRunner.assert(typeof CoordinateModule.getScore === 'function', 'getScore missing');
    TestRunner.assert(typeof CoordinateModule.reset === 'function', 'reset missing');
  });

  TestRunner.test('CM-02: init renders 64 squares', function() {
    CoordinateModule.reset();
    CoordinateModule.init();
    const grid = document.getElementById('coordinateBoardGrid');
    const squares = grid.querySelectorAll('.square');
    TestRunner.assertEqual(squares.length, 64, 'Expected 64 squares after init');
  });

  TestRunner.test('CM-03: 64 squares random coverage without repetition', async function() {
    CoordinateModule.reset();
    CoordinateModule.startPractice('white', 'a');
    const seen = new Set();
    for (let i = 0; i < 64; i++) {
      const target = readTargetFromPrompt();
      TestRunner.assert(target !== null && target.length === 2, 'Invalid target: ' + target);
      TestRunner.assert(!seen.has(target), 'Duplicate target: ' + target + ' at iteration ' + i);
      seen.add(target);
      CoordinateModule.submitAnswer(target);
      if (i < 63) await new Promise(function(r) { setTimeout(r, 10); });
    }
    TestRunner.assertEqual(seen.size, 64, 'Should have covered all 64 squares');
  });

  TestRunner.test('CM-04: pool refills after 64 questions', async function() {
    CoordinateModule.reset();
    CoordinateModule.startPractice('white', 'a');
    for (let i = 0; i < 65; i++) {
      const target = readTargetFromPrompt();
      TestRunner.assert(target !== null, 'Target should not be null at iteration ' + i);
      CoordinateModule.submitAnswer(target);
      if (i < 64) await new Promise(function(r) { setTimeout(r, 10); });
    }
    const score = CoordinateModule.getScore();
    TestRunner.assertEqual(score.score, 65, 'Should have 65 correct answers');
  });

  TestRunner.test('CM-05: wrong answer forces retry in mode A', function() {
    CoordinateModule.reset();
    CoordinateModule.startPractice('white', 'a');
    const target = readTargetFromPrompt();
    const wrong = target === 'a1' ? 'a2' : 'a1';

    CoordinateModule.submitAnswer(wrong);
    const scoreAfterWrong = CoordinateModule.getScore();
    TestRunner.assertEqual(scoreAfterWrong.total, 1, 'Total should be 1 after wrong');
    TestRunner.assertEqual(scoreAfterWrong.score, 0, 'Score should be 0 after wrong');

    const anotherWrong = wrong === 'b1' ? 'b2' : 'b1';
    CoordinateModule.submitAnswer(anotherWrong);
    const scoreAfterSecondWrong = CoordinateModule.getScore();
    TestRunner.assertEqual(scoreAfterSecondWrong.total, 1, 'Total should still be 1');

    CoordinateModule.submitAnswer(target);
    const newTarget = readTargetFromPrompt();
    TestRunner.assert(newTarget !== target, 'Should advance to next question after correction');
  });

  TestRunner.test('CM-06: wrong answer forces retry in mode B', function() {
    CoordinateModule.reset();
    CoordinateModule.startPractice('white', 'b');
    const target = readTargetFromHighlight();
    TestRunner.assert(target !== null, 'Mode B should highlight a target');
    const wrong = target === 'a1' ? 'a2' : 'a1';

    CoordinateModule.submitAnswer(wrong);
    const scoreAfterWrong = CoordinateModule.getScore();
    TestRunner.assertEqual(scoreAfterWrong.total, 1, 'Total should be 1 after wrong');
    TestRunner.assertEqual(scoreAfterWrong.score, 0, 'Score should be 0 after wrong');

    CoordinateModule.submitAnswer('h8');
    const scoreAfterSecond = CoordinateModule.getScore();
    TestRunner.assertEqual(scoreAfterSecond.total, 1, 'Total should still be 1');

    CoordinateModule.submitAnswer(target);
    const newTarget = readTargetFromHighlight();
    TestRunner.assert(newTarget !== target, 'Should advance to next question');
  });

  TestRunner.test('CM-07: black perspective reverses labels', function() {
    CoordinateModule.reset();
    CoordinateModule.startPractice('black', 'a');
    const wrapper = document.getElementById('coordinateBoardWrapper');
    const rowLabels = wrapper.querySelector('.board-row-labels');
    const colLabels = wrapper.querySelector('.board-col-labels');
    TestRunner.assertEqual(rowLabels.children[0].textContent, '1', 'Black top rank should be 1');
    TestRunner.assertEqual(rowLabels.children[7].textContent, '8', 'Black bottom rank should be 8');
    TestRunner.assertEqual(colLabels.children[0].textContent, 'h', 'Black left file should be h');
    TestRunner.assertEqual(colLabels.children[7].textContent, 'a', 'Black right file should be a');
  });

  TestRunner.test('CM-08: timer stops at zero and shows result', async function() {
    CoordinateModule.reset();
    CoordinateModule.setTimer(1);
    CoordinateModule.startPractice('white', 'a');
    await new Promise(function(resolve) { setTimeout(resolve, 1200); });
    const overlay = document.getElementById('coordResultOverlay');
    TestRunner.assert(overlay.classList.contains('show'), 'Result overlay should be shown after timeout');
  });

  TestRunner.test('CM-09: setTimer updates duration', function() {
    CoordinateModule.reset();
    CoordinateModule.setTimer(30);
    CoordinateModule.startPractice('white', 'a');
    const timerEl = document.getElementById('coordTimer');
    TestRunner.assert(timerEl.style.display !== 'none', 'Timer should be visible');
    TestRunner.assert(timerEl.textContent === '00:30', 'Timer should show 00:30, got: ' + timerEl.textContent);
  });

  TestRunner.test('CM-10: getScore returns correct data', function() {
    CoordinateModule.reset();
    CoordinateModule.startPractice('white', 'a');
    const target = readTargetFromPrompt();
    CoordinateModule.submitAnswer(target);
    const score = CoordinateModule.getScore();
    TestRunner.assertEqual(score.score, 1, 'Score should be 1');
    TestRunner.assertEqual(score.total, 1, 'Total should be 1');
    TestRunner.assertEqual(score.accuracy, 1, 'Accuracy should be 1.0');

    const target2 = readTargetFromPrompt();
    CoordinateModule.submitAnswer('xx');
    const score2 = CoordinateModule.getScore();
    TestRunner.assertEqual(score2.score, 1, 'Score should still be 1');
    TestRunner.assertEqual(score2.total, 2, 'Total should be 2');
    TestRunner.assertEqual(score2.accuracy, 0.5, 'Accuracy should be 0.5');
  });

  TestRunner.test('CM-11: reset clears state and shows setup UI', function() {
    CoordinateModule.reset();
    CoordinateModule.startPractice('white', 'a');
    CoordinateModule.submitAnswer(readTargetFromPrompt());
    CoordinateModule.reset();

    const score = CoordinateModule.getScore();
    TestRunner.assertEqual(score.score, 0, 'Score should be 0');
    TestRunner.assertEqual(score.total, 0, 'Total should be 0');
    TestRunner.assertEqual(score.accuracy, 0, 'Accuracy should be 0');

    const setupActions = document.getElementById('coordSetupActions');
    const modeActions = document.getElementById('coordModeActions');
    TestRunner.assert(setupActions.style.display !== 'none', 'Setup actions should be visible');
    TestRunner.assert(modeActions.style.display === 'none', 'Mode actions should be hidden');
  });

  TestRunner.test('CM-12: no global variable leakage except CoordinateModule', function() {
    TestRunner.assert(typeof window.CoordinateModule === 'object', 'CoordinateModule should be global');
    TestRunner.assert(typeof window.coordState === 'undefined', 'coordState should not leak');
    TestRunner.assert(typeof window.ALL_SQUARES === 'undefined', 'ALL_SQUARES should not leak');
    TestRunner.assert(typeof window.showCoordinate === 'undefined', 'showCoordinate should not leak');
    TestRunner.assert(typeof window.startCoordinatePractice === 'undefined', 'startCoordinatePractice should not leak');
  });

  TestRunner.test('CM-13: unlimited timer hides timer display', function() {
    CoordinateModule.reset();
    CoordinateModule.setTimer(0);
    CoordinateModule.startPractice('white', 'a');
    const timerEl = document.getElementById('coordTimer');
    TestRunner.assert(timerEl.style.display === 'none' || timerEl.style.display === '', 'Timer should be hidden when unlimited');
  });

  TestRunner.test('CM-14: mode B highlights target square', function() {
    CoordinateModule.reset();
    CoordinateModule.startPractice('white', 'b');
    const target = readTargetFromHighlight();
    TestRunner.assert(target !== null, 'A square should be highlighted in mode B');
  });

  TestRunner.test('CM-15: white perspective labels are standard', function() {
    CoordinateModule.reset();
    CoordinateModule.startPractice('white', 'a');
    const wrapper = document.getElementById('coordinateBoardWrapper');
    const rowLabels = wrapper.querySelector('.board-row-labels');
    const colLabels = wrapper.querySelector('.board-col-labels');
    TestRunner.assertEqual(rowLabels.children[0].textContent, '8', 'White top rank should be 8');
    TestRunner.assertEqual(rowLabels.children[7].textContent, '1', 'White bottom rank should be 1');
    TestRunner.assertEqual(colLabels.children[0].textContent, 'a', 'White left file should be a');
    TestRunner.assertEqual(colLabels.children[7].textContent, 'h', 'White right file should be h');
  });

  TestRunner.test('CM-16: StorageModule.addCoordinateRecord called on timeout', async function() {
    StorageModule._records = [];
    CoordinateModule.reset();
    CoordinateModule.setTimer(1);
    CoordinateModule.startPractice('white', 'a');
    await new Promise(function(resolve) { setTimeout(resolve, 1200); });
    TestRunner.assert(StorageModule._records.length >= 1, 'Should have saved a record');
    const rec = StorageModule._records[StorageModule._records.length - 1];
    TestRunner.assertEqual(rec.mode, 'a', 'Record mode should be a');
    TestRunner.assertEqual(rec.side, 'white', 'Record side should be white');
  });
});

TestRunner.run().then(function(r) {
  if (r.failed > 0) {
    console.error('CoordinateModule Node.js tests failed: ' + r.failed + '/' + (r.passed + r.failed));
    process.exit(1);
  } else {
    console.log('CoordinateModule Node.js tests passed: ' + r.passed + '/' + (r.passed + r.failed));
  }
});
