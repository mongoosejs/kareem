'use strict';

const assert = require('assert');
const Kareem = require('../');
const { beforeEach, describe, it } = require('mocha');

describe('execPre', function() {
  let hooks;

  beforeEach(function() {
    hooks = new Kareem();
  });

  it('handles errors with multiple pres', async function() {
    const execed = {};

    hooks.pre('cook', async function() {
      execed.first = true;
    });

    hooks.pre('cook', async function() {
      execed.second = true;
      throw new Error('error!');
    });

    hooks.pre('cook', async function() {
      execed.third = true;
    });

    await assert.rejects(hooks.execPre('cook', null), /error!/);
    assert.equal(2, Object.keys(execed).length);
    assert.ok(execed.first);
    assert.ok(execed.second);
  });

  it('sync errors', async function() {
    let called = 0;

    hooks.pre('cook', function() {
      throw new Error('woops!');
    });

    hooks.pre('cook', function() {
      ++called;
    });

    await assert.rejects(hooks.execPre('cook', null), /woops!/);
    assert.equal(called, 0);
  });

  it('unshift', function() {
    const f1 = function() {};
    const f2 = function() {};
    hooks.pre('cook', false, f1);
    hooks.pre('cook', false, f2, null, true);
    assert.strictEqual(hooks._pres.get('cook')[0].fn, f2);
    assert.strictEqual(hooks._pres.get('cook')[1].fn, f1);
  });

  it('throws error if no function', function() {
    assert.throws(() => hooks.pre('test'), /got "undefined"/);
  });

  it('arbitrary options', function() {
    const f1 = function() {};
    const f2 = function() {};
    hooks.pre('cook', { foo: 'bar' }, f1);
    hooks.pre('cook', { bar: 'baz' }, f2, null, true);
    assert.equal(hooks._pres.get('cook')[1].foo, 'bar');
    assert.equal(hooks._pres.get('cook')[0].bar, 'baz');
  });

  it('handles sync errors in pre if there are more hooks', async function() {
    const execed = {};

    hooks.pre('cook', function() {
      execed.first = true;
      throw new Error('Oops!');
    });

    hooks.pre('cook', function() {
      execed.second = true;
    });

    const err = await hooks.execPre('cook', null).then(() => null, err => err);
    assert.ok(err);
    assert.ok(execed.first);
    assert.equal(err.message, 'Oops!');
  });

  it('supports skipWrappedFunction', async function() {
    const execed = {};

    hooks.pre('cook', function() {
      throw Kareem.skipWrappedFunction(42);
    });

    hooks.pre('cook', function() {
      execed.second = true;
    });

    const err = await hooks.execPre('cook', null).then(() => null, err => err);
    assert.ok(execed.second);
    assert.ok(err instanceof Kareem.skipWrappedFunction);
  });

  it('supports overwriteArguments with return', async function() {
    hooks.pre('init', function(obj) {
      if (typeof obj === 'string') {
        return Kareem.overwriteArguments({ name: obj });
      }
    });

    const args = await hooks.execPre('init', null, ['test']);
    assert.strictEqual(args.length, 1);
    assert.strictEqual(typeof args[0], 'object');
    assert.strictEqual(args[0].name, 'test');
  });

  it('supports overwriteArguments with throw', async function() {
    hooks.pre('init', function(obj) {
      if (typeof obj === 'string') {
        throw Kareem.overwriteArguments({ name: obj });
      }
    });

    const args = await hooks.execPre('init', null, ['test']);
    assert.strictEqual(args.length, 1);
    assert.strictEqual(typeof args[0], 'object');
    assert.strictEqual(args[0].name, 'test');
  });

  it('supports overwriteArguments with multiple hooks', async function() {
    hooks.pre('init', function(obj) {
      if (typeof obj === 'string') {
        return Kareem.overwriteArguments({ name: obj });
      }
    });

    hooks.pre('init', function(obj) {
      if (obj && typeof obj === 'object' && !obj.modified) {
        return Kareem.overwriteArguments({ ...obj, modified: true });
      }
    });

    const args = await hooks.execPre('init', null, ['test']);
    assert.strictEqual(args.length, 1);
    assert.deepStrictEqual(args[0], { name: 'test', modified: true });
  });

  it('supports overwriteArguments with async functions', async function() {
    hooks.pre('init', async function(obj) {
      if (typeof obj === 'string') {
        return Kareem.overwriteArguments({ name: obj });
      }
    });

    const args = await hooks.execPre('init', null, ['async-test']);
    assert.strictEqual(args.length, 1);
    assert.strictEqual(typeof args[0], 'object');
    assert.strictEqual(args[0].name, 'async-test');
  });

  it('supports filter option to select which hooks to run', async function() {
    const execed = [];

    const fn1 = function() { execed.push('first'); };
    fn1.skipMe = true;
    hooks.pre('cook', fn1);

    const fn2 = function() { execed.push('second'); };
    hooks.pre('cook', fn2);

    const fn3 = function() { execed.push('third'); };
    fn3.skipMe = true;
    hooks.pre('cook', fn3);

    await hooks.execPre('cook', null, [], { filter: hook => !hook.fn.skipMe });
    assert.deepStrictEqual(execed, ['second']);
  });

  for (const options of [{ filter: null }, { filter: undefined }, undefined]) {
    it(`runs all hooks when filter options is ${JSON.stringify(options)}`, async function() {
      const execed = [];

      hooks.pre('cook', function() { execed.push('first'); });
      hooks.pre('cook', function() { execed.push('second'); });

      await hooks.execPre('cook', null, [], options);
      assert.deepStrictEqual(execed, ['first', 'second']);
    });
  }
});

describe('execPreSync', function() {
  let hooks;

  beforeEach(function() {
    hooks = new Kareem();
  });

  it('executes hooks synchronously', function() {
    const execed = {};

    hooks.pre('cook', function() {
      execed.first = true;
    });

    hooks.pre('cook', function() {
      execed.second = true;
    });

    hooks.execPreSync('cook', null);
    assert.ok(execed.first);
    assert.ok(execed.second);
  });

  it('works with no hooks specified', function() {
    assert.doesNotThrow(function() {
      hooks.execPreSync('cook', null);
    });
  });

  it('supports overwriteArguments', function() {
    hooks.pre('init', function(obj) {
      if (typeof obj === 'string') {
        return Kareem.overwriteArguments({ name: obj });
      }
    });

    const args = hooks.execPreSync('init', null, ['test']);
    assert.strictEqual(args.length, 1);
    assert.strictEqual(typeof args[0], 'object');
    assert.strictEqual(args[0].name, 'test');
  });

  it('supports overwriteArguments with multiple hooks', function() {
    hooks.pre('init', function(obj) {
      if (typeof obj === 'string') {
        return Kareem.overwriteArguments({ name: obj });
      }
    });

    hooks.pre('init', function(obj) {
      if (obj && typeof obj === 'object' && !obj.modified) {
        return Kareem.overwriteArguments({ ...obj, modified: true });
      }
    });

    const args = hooks.execPreSync('init', null, ['test']);
    assert.strictEqual(args.length, 1);
    assert.deepStrictEqual(args[0], { name: 'test', modified: true });
  });
});
