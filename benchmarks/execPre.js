'use strict';

const Kareem = require('../index');

let sink = 0;
const numIterations = Number(process.env.KAREEM_BENCH_ITERATIONS || 200000);

run().catch(err => {
  console.error(err);
  process.exit(1);
});

async function run() {
  const scenarios = [
    ['1 hook, 1 arg', 1, ['x']],
    ['5 hooks, 1 arg', 5, ['x']],
    ['10 hooks, 1 arg', 10, ['x']],
    ['5 hooks, 3 args', 5, ['x', 42, true]],
    ['5 hooks, 3 args + callback', 5, ['x', 42, noop]],
    ['10 hooks, 3 args + callback', 10, ['x', 42, noop]]
  ];

  const results = [];

  for (const [label, numHooks, args] of scenarios) {
    const hooks = new Kareem();
    for (let i = 0; i < numHooks; ++i) {
      hooks.pre('test', function() {
        sink += arguments.length;
        if (typeof arguments[0] === 'string') {
          sink += arguments[0].length;
        }
      });
    }

    for (let i = 0; i < 20000; ++i) {
      await hooks.execPre('test', null, args);
    }

    const start = process.hrtime.bigint();
    for (let i = 0; i < numIterations; ++i) {
      await hooks.execPre('test', null, args);
    }
    const durationNs = process.hrtime.bigint() - start;
    const totalMs = Number(durationNs) / 1e6;

    results.push({
      scenario: label,
      iterations: numIterations,
      totalMs: +totalMs.toFixed(3),
      avgUsPerExec: +((totalMs * 1000) / numIterations).toFixed(3)
    });
  }

  console.log(JSON.stringify({ results }, null, 2));
}

function noop() {}

process.on('exit', () => {
  if (sink === 0) {
    console.error('unexpected sink value');
    process.exitCode = 1;
  }
});
