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
});
