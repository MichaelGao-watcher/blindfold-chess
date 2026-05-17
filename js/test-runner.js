(function() {
  'use strict';

  class AssertionError extends Error {
    constructor(msg) {
      super(msg);
      this.name = 'AssertionError';
    }
  }

  const suites = [];
  let currentSuite = null;

  const TestRunner = {
    suite(name, fn) {
      currentSuite = { name, tests: [], setupError: null };
      try {
        fn();
      } catch (e) {
        currentSuite.setupError = e;
      }
      suites.push(currentSuite);
      currentSuite = null;
    },

    test(name, fn) {
      if (!currentSuite) throw new Error('test() must be called inside suite()');
      currentSuite.tests.push({ name, fn });
    },

    assert(cond, msg) {
      if (!cond) throw new AssertionError(msg || 'Assertion failed');
    },

    assertEqual(a, b, msg) {
      const sa = JSON.stringify(a), sb = JSON.stringify(b);
      if (sa !== sb) throw new AssertionError(msg || `Expected ${sa} but got ${sb}`);
    },

    assertThrows(fn, msg) {
      let threw = false;
      try { fn(); } catch (e) { threw = true; }
      if (!threw) throw new AssertionError(msg || 'Expected function to throw');
    },

    async run() {
      return this._runSuites(suites);
    },

    async runModule(name) {
      const suite = suites.find(s => s.name === name);
      if (!suite) throw new Error(`Suite not found: ${name}`);
      return this._runSuites([suite]);
    },

    async _runSuites(list) {
      const out = [];
      out.push('=======================================');
      out.push('Test Report');
      out.push('=======================================');

      let passed = 0, failed = 0;
      const t0 = Date.now();

      for (const suite of list) {
        const s0 = Date.now();
        let sp = 0, sf = 0;

        if (suite.setupError) {
          sf = suite.tests.length;
          failed += sf;
          out.push(`✗ Suite: ${suite.name} (0/${suite.tests.length} passed, suite setup failed)`);
          out.push(`  ✗ suite setup: ${suite.setupError.name}: ${suite.setupError.message}`);
          continue;
        }

        for (const test of suite.tests) {
          test.error = null;
          try {
            const r = test.fn();
            if (r && typeof r.then === 'function') {
              await Promise.race([
                r,
                new Promise((_, reject) => setTimeout(() => reject(new AssertionError('Timeout: test exceeded 5000ms')), 5000))
              ]);
            }
            sp++;
          } catch (e) {
            sf++;
            test.error = e;
          }
        }

        passed += sp; failed += sf;
        const suiteMs = Date.now() - s0;
        const suiteOk = sf === 0;
        out.push(`${suiteOk ? '✓' : '✗'} Suite: ${suite.name} (${sp}/${suite.tests.length} passed, ${suiteMs}ms)`);

        for (const t of suite.tests) {
          if (t.error) {
            const n = t.error.name || 'Error', m = t.error.message || '';
            out.push(`  ✗ test: ${t.name} ... ${n}: ${m}`);
            if (t.error.stack) {
              t.error.stack.split('\n').slice(1, 4).forEach(l => out.push(`    ${l.trim()}`));
            }
          } else {
            out.push(`  ✓ test: ${t.name}`);
          }
        }
      }

      const ms = Date.now() - t0;
      out.push('=======================================');
      out.push(`Total: ${passed} passed, ${failed} failed, ${ms}ms`);
      out.push('=======================================');

      const report = out.join('\n');
      console.log(report);

      if (typeof document !== 'undefined') {
        const el = document.getElementById('test-results') || document.body;
        const pre = document.createElement('pre');
        pre.style.fontFamily = 'monospace';
        pre.style.whiteSpace = 'pre-wrap';
        pre.textContent = report;
        el.appendChild(pre);
      }

      return { passed, failed, totalMs: ms };
    }
  };

  if (typeof window === 'undefined') global.window = global;
  window.TestRunner = TestRunner;
})();

// Node.js self-test mode
if (typeof require !== 'undefined' && require.main === module) {
  TestRunner.suite('TestRunner Core', () => {
    TestRunner.test('assert passes on truthy', () => {
      TestRunner.assert(true, 'ok');
    });

    TestRunner.test('assertEqual primitives', () => {
      TestRunner.assertEqual(42, 42);
      TestRunner.assertEqual('hello', 'hello');
    });

    TestRunner.test('assertEqual objects', () => {
      TestRunner.assertEqual({a: 1}, {a: 1});
      TestRunner.assertEqual([1, 2], [1, 2]);
    });

    TestRunner.test('assertThrows catches error', () => {
      TestRunner.assertThrows(() => { throw new Error('boom'); });
    });

    TestRunner.test('assert failure throws AssertionError', () => {
      let err = null;
      try { TestRunner.assert(false, 'expected'); } catch (e) { err = e; }
      TestRunner.assert(err !== null, 'should throw');
      TestRunner.assertEqual(err.name, 'AssertionError');
      TestRunner.assertEqual(err.message, 'expected');
    });

    TestRunner.test('async test resolves', async () => {
      const v = await Promise.resolve(7);
      TestRunner.assertEqual(v, 7);
    });

    TestRunner.test('async test finishes within timeout', async () => {
      await new Promise(r => setTimeout(r, 20));
      TestRunner.assert(true);
    });
  });

  TestRunner.run().then(r => {
    if (r.failed > 0) {
      console.error('Self-test failed');
      if (typeof process !== 'undefined') process.exit(1);
    }
  });
}
