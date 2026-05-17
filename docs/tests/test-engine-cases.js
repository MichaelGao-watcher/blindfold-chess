(function() {
  'use strict';

  const WAIT_FOR_BESTMOVE = 300;

  TestRunner.suite('EngineModule', () => {

    // EN-01
    TestRunner.test('EN-01: init() returns Promise and loads successfully', async () => {
      EngineModule.terminate();
      const result = EngineModule.init();
      TestRunner.assert(result instanceof Promise || (result && typeof result.then === 'function'), 'init() should return a Promise');
      await result;
      TestRunner.assert(EngineModule.isReady(), 'Engine should be ready after init');
    });

    // EN-02/03
    TestRunner.test('EN-02/03: Worker load failure propagates error', async () => {
      EngineModule.terminate();
      const originalWorker = window.Worker;
      const originalFetch = typeof fetch !== 'undefined' ? fetch : undefined;

      window.Worker = class BrokenWorker {
        constructor() { throw new Error('Simulated Worker failure'); }
      };
      if (typeof fetch !== 'undefined') {
        window.fetch = function() { throw new Error('Simulated fetch failure'); };
      }

      let errorCaught = false;
      try {
        await EngineModule.init();
      } catch (e) {
        errorCaught = true;
      }

      TestRunner.assert(errorCaught, 'Should reject when Worker creation fails');
      window.Worker = originalWorker;
      if (originalFetch) window.fetch = originalFetch;
    });

    // EN-04
    TestRunner.test('EN-04: terminate() cleans up resources', async () => {
      await EngineModule.init();
      TestRunner.assert(EngineModule.isReady(), 'Should be ready before terminate');
      EngineModule.terminate();
      TestRunner.assert(!EngineModule.isReady(), 'Should not be ready after terminate');
      TestRunner.assertEqual(EngineModule.__getState(), 'terminated');
    });

    // EN-05
    TestRunner.test('EN-05: isReady() returns correct state', async () => {
      EngineModule.terminate();
      TestRunner.assert(!EngineModule.isReady(), 'Not ready before init');
      await EngineModule.init();
      TestRunner.assert(EngineModule.isReady(), 'Ready after init');

      EngineModule.go(() => {});
      TestRunner.assert(!EngineModule.isReady(), 'Not ready while thinking');

      await new Promise(r => setTimeout(r, WAIT_FOR_BESTMOVE));
      TestRunner.assert(EngineModule.isReady(), 'Ready after bestmove');
    });

    // EN-06/07
    TestRunner.test('EN-06/07: UCI commands and bestmove parsing', async () => {
      EngineModule.terminate();
      await EngineModule.init();

      let move = null;
      EngineModule.setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      EngineModule.go((m) => { move = m; });

      await new Promise(r => setTimeout(r, WAIT_FOR_BESTMOVE));
      TestRunner.assertEqual(move, 'e2e4', 'bestmove should be parsed as e2e4');
    });

    // EN-08
    TestRunner.test('EN-08: Commands sent in order', async () => {
      EngineModule.terminate();
      await EngineModule.init();

      const commands = [];
      const w = EngineModule.__getWorker();
      const origPost = w.postMessage.bind(w);
      w.postMessage = (msg) => { commands.push(msg); origPost(msg); };

      EngineModule.setDifficulty('easy');
      EngineModule.setPosition('startpos');
      EngineModule.go(() => {});

      const limitIdx = commands.findIndex(c => c === 'setoption name UCI_LimitStrength value true');
      const posIdx = commands.findIndex(c => c.startsWith('position fen'));
      const goIdx = commands.findIndex(c => c.startsWith('go depth'));

      TestRunner.assert(limitIdx !== -1, 'UCI_LimitStrength should be sent');
      TestRunner.assert(posIdx !== -1, 'position should be sent');
      TestRunner.assert(goIdx !== -1, 'go should be sent');
      TestRunner.assert(limitIdx < posIdx, 'setoption should come before position');
      TestRunner.assert(posIdx < goIdx, 'position should come before go');

      w.postMessage = origPost;
      await new Promise(r => setTimeout(r, WAIT_FOR_BESTMOVE));
    });

    // EN-09
    TestRunner.test('EN-09: go() timeout callbacks null', async () => {
      EngineModule.terminate();
      await EngineModule.init();
      EngineModule.__TEST_SET_TIMEOUT(50);

      const originalWorker = window.Worker;
      const originalPostMessage = originalWorker.prototype.postMessage;
      window.Worker = class SilentWorker extends originalWorker {
        postMessage(msg) {
          if (msg.startsWith('go ')) return;
          originalPostMessage.call(this, msg);
        }
      };

      EngineModule.terminate();
      await EngineModule.init();

      let result = 'not-called';
      EngineModule.go((m) => { result = m; });

      await new Promise(r => setTimeout(r, 150));
      TestRunner.assertEqual(result, null, 'Timeout should callback with null');

      window.Worker = originalWorker;
      EngineModule.__TEST_SET_TIMEOUT(30000);
    });

    // EN-10/11
    TestRunner.test('EN-10/11: Preset difficulty parameters correct', async () => {
      EngineModule.terminate();
      await EngineModule.init();

      const commands = [];
      const w = EngineModule.__getWorker();
      const origPost = w.postMessage.bind(w);
      w.postMessage = (msg) => { commands.push(msg); origPost(msg); };

      EngineModule.setDifficulty('easy');
      TestRunner.assert(commands.includes('setoption name UCI_LimitStrength value true'), 'easy: LimitStrength sent');
      TestRunner.assert(commands.some(c => c.includes('UCI_Elo value 800')), 'easy: Elo 800');
      TestRunner.assert(commands.some(c => c.includes('Skill Level value 5')), 'easy: Skill 5');

      commands.length = 0;
      EngineModule.setDifficulty('medium');
      TestRunner.assert(commands.some(c => c.includes('UCI_Elo value 1400')), 'medium: Elo 1400');
      TestRunner.assert(commands.some(c => c.includes('Skill Level value 10')), 'medium: Skill 10');

      commands.length = 0;
      EngineModule.setDifficulty('hard');
      TestRunner.assert(commands.some(c => c.includes('UCI_Elo value 2000')), 'hard: Elo 2000');
      TestRunner.assert(commands.some(c => c.includes('Skill Level value 15')), 'hard: Skill 15');

      commands.length = 0;
      EngineModule.setDifficulty('expert');
      TestRunner.assert(commands.some(c => c.includes('UCI_Elo value 2800')), 'expert: Elo 2800');
      TestRunner.assert(commands.some(c => c.includes('Skill Level value 20')), 'expert: Skill 20');

      w.postMessage = origPost;
    });

    // EN-12
    TestRunner.test('EN-12: Custom Elo 400~3200 mapping', async () => {
      EngineModule.terminate();
      await EngineModule.init();

      const commands = [];
      const w = EngineModule.__getWorker();
      const origPost = w.postMessage.bind(w);
      w.postMessage = (msg) => { commands.push(msg); origPost(msg); };

      EngineModule.setDifficulty({ elo: 400 });
      TestRunner.assert(commands.some(c => c.includes('UCI_Elo value 400')), 'Min Elo 400');
      TestRunner.assert(commands.some(c => c.includes('Skill Level value 0')), 'Elo 400 -> Skill 0');

      commands.length = 0;
      EngineModule.setDifficulty({ elo: 3200 });
      TestRunner.assert(commands.some(c => c.includes('UCI_Elo value 3200')), 'Max Elo 3200');
      TestRunner.assert(commands.some(c => c.includes('Skill Level value 20')), 'Elo 3200 -> Skill 20');

      commands.length = 0;
      EngineModule.setDifficulty({ elo: 1800 });
      const expectedSkill = Math.round((1800 - 400) / 2800 * 20);
      TestRunner.assertEqual(expectedSkill, 10, 'Expected skill for 1800 is 10');
      TestRunner.assert(commands.some(c => c.includes('Skill Level value ' + expectedSkill)), 'Elo 1800 -> Skill 10');

      commands.length = 0;
      EngineModule.setDifficulty({ elo: 100 });
      TestRunner.assert(commands.some(c => c.includes('UCI_Elo value 400')), 'Clamped to 400');

      commands.length = 0;
      EngineModule.setDifficulty({ elo: 5000 });
      TestRunner.assert(commands.some(c => c.includes('UCI_Elo value 3200')), 'Clamped to 3200');

      w.postMessage = origPost;
    });

    // EN-13
    TestRunner.test('EN-13: UCI_LimitStrength always true', async () => {
      EngineModule.terminate();
      await EngineModule.init();

      const commands = [];
      const w = EngineModule.__getWorker();
      const origPost = w.postMessage.bind(w);
      w.postMessage = (msg) => { commands.push(msg); origPost(msg); };

      EngineModule.setDifficulty({ elo: 1600 });
      TestRunner.assert(commands.includes('setoption name UCI_LimitStrength value true'), 'LimitStrength true for custom Elo');

      commands.length = 0;
      EngineModule.setDifficulty('hard');
      TestRunner.assert(commands.includes('setoption name UCI_LimitStrength value true'), 'LimitStrength true for preset');

      w.postMessage = origPost;
    });

    // EN-14
    TestRunner.test('EN-14: Depth configuration', async () => {
      EngineModule.terminate();
      await EngineModule.init();

      const commands = [];
      const w = EngineModule.__getWorker();
      const origPost = w.postMessage.bind(w);
      w.postMessage = (msg) => { commands.push(msg); origPost(msg); };

      EngineModule.setDifficulty({ elo: 1600, depth: 12 });
      EngineModule.setPosition('startpos');
      EngineModule.go(() => {});

      TestRunner.assert(commands.some(c => c.includes('go depth 12')), 'Custom depth 12 used');

      w.postMessage = origPost;
      await new Promise(r => setTimeout(r, WAIT_FOR_BESTMOVE));
    });

    // EN-15/16/17/18/19
    TestRunner.test('EN-15/16/17/18/19: go() flow correct, callback receives bestmove', async () => {
      EngineModule.terminate();
      await EngineModule.init();
      EngineModule.setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

      let move = null;
      EngineModule.go((m) => { move = m; });
      TestRunner.assert(!EngineModule.isReady(), 'Should be thinking after go()');

      await new Promise(r => setTimeout(r, WAIT_FOR_BESTMOVE));
      TestRunner.assertEqual(move, 'e2e4', 'Callback should receive bestmove e2e4');
      TestRunner.assert(EngineModule.isReady(), 'Should be ready after bestmove');
    });

    // EN-20
    TestRunner.test('EN-20: stop() interrupts thinking', async () => {
      EngineModule.terminate();
      await EngineModule.init();
      EngineModule.go(() => {});
      TestRunner.assert(!EngineModule.isReady(), 'Should be thinking');

      EngineModule.stop();
      await new Promise(r => setTimeout(r, 50));
      TestRunner.assert(EngineModule.isReady(), 'Should be ready after stop()');
    });

    // EN-21/22/23/24
    TestRunner.test('EN-21/22/23/24: goMultiPv returns candidates with correct format', async () => {
      EngineModule.terminate();
      await EngineModule.init();
      EngineModule.setPosition('startpos');

      let results = null;
      EngineModule.goMultiPv((r) => { results = r; }, 3);

      await new Promise(r => setTimeout(r, WAIT_FOR_BESTMOVE));
      TestRunner.assert(Array.isArray(results), 'Should return array');
      TestRunner.assertEqual(results.length, 3, 'Should return 3 candidates');

      const first = results[0];
      TestRunner.assertEqual(first.move, 'e2e4', 'First move should be e2e4');
      TestRunner.assert(first.pv.includes('e2e4'), 'PV should contain the move');
      TestRunner.assertEqual(first.score, '+0.35', 'Score should be +0.35 for cp 35');

      const second = results[1];
      TestRunner.assertEqual(second.move, 'd2d4', 'Second move should be d2d4');
      TestRunner.assertEqual(second.score, '+0.25', 'Score should be +0.25 for cp 25');
    });

    // EN-25
    TestRunner.test('EN-25: Mate score format', async () => {
      EngineModule.terminate();
      await EngineModule.init();

      let results = null;
      EngineModule.goMultiPv((r) => { results = r; }, 1);

      await new Promise(r => setTimeout(r, WAIT_FOR_BESTMOVE));
      TestRunner.assertEqual(results.length, 1, 'Should return 1 candidate');
      TestRunner.assertEqual(results[0].score, 'M3', 'Mate score should be M3');
    });

    // EN-26/27/28
    TestRunner.test('EN-26/27/28: State machine transitions', async () => {
      EngineModule.terminate();
      TestRunner.assertEqual(EngineModule.__getState(), 'terminated');

      await EngineModule.init();
      TestRunner.assertEqual(EngineModule.__getState(), 'ready');

      EngineModule.go(() => {});
      TestRunner.assertEqual(EngineModule.__getState(), 'thinking');

      EngineModule.stop();
      await new Promise(r => setTimeout(r, 50));
      TestRunner.assertEqual(EngineModule.__getState(), 'ready');

      EngineModule.go(() => {});
      TestRunner.assertEqual(EngineModule.__getState(), 'thinking');

      await new Promise(r => setTimeout(r, WAIT_FOR_BESTMOVE));
      TestRunner.assertEqual(EngineModule.__getState(), 'ready');

      EngineModule.terminate();
      TestRunner.assertEqual(EngineModule.__getState(), 'terminated');
      TestRunner.assert(!EngineModule.isReady(), 'Not ready after terminate');
    });

    // EN-27: go() during thinking auto-stops
    TestRunner.test('EN-27: go() during thinking auto-stops and uses new callback', async () => {
      EngineModule.terminate();
      await EngineModule.init();

      let move1 = null;
      let move2 = null;
      EngineModule.go((m) => { move1 = m; });
      EngineModule.go((m) => { move2 = m; });

      await new Promise(r => setTimeout(r, WAIT_FOR_BESTMOVE + 100));
      TestRunner.assert(move1 === null, 'First callback should not be called (replaced)');
      TestRunner.assertEqual(move2, 'e2e4', 'Second callback should receive bestmove');
    });

    // EN-28: ignore messages after terminate
    TestRunner.test('EN-28: Delayed messages ignored after terminate', async () => {
      EngineModule.terminate();
      await EngineModule.init();

      let called = false;
      EngineModule.go(() => { called = true; });
      EngineModule.terminate();

      await new Promise(r => setTimeout(r, WAIT_FOR_BESTMOVE));
      TestRunner.assert(!called, 'Callback should not fire after terminate');
    });

    // EN-29/30/31/32/33: Comprehensive
    TestRunner.test('EN-29/30/31/32/33: Comprehensive end-to-end', async () => {
      EngineModule.terminate();
      await EngineModule.init();

      EngineModule.setDifficulty('medium');
      EngineModule.setPosition('startpos');

      let move = null;
      EngineModule.go((m) => { move = m; });
      await new Promise(r => setTimeout(r, WAIT_FOR_BESTMOVE));
      TestRunner.assertEqual(move, 'e2e4', 'End-to-end go() works');

      let multi = null;
      EngineModule.goMultiPv((r) => { multi = r; }, 5);
      await new Promise(r => setTimeout(r, WAIT_FOR_BESTMOVE));
      TestRunner.assertEqual(multi.length, 5, 'End-to-end multiPV works');

      EngineModule.terminate();
      TestRunner.assertEqual(EngineModule.__getState(), 'terminated');
    });

  });
})();
