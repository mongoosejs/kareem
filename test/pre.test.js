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

    hooks.pre('cook', function(done) {
      execed.first = true;
      done();
    });

    hooks.pre('cook', function(done) {
      execed.second = true;
      done('error!');
    });

    hooks.pre('cook', function(done) {
      execed.third = true;
      done();
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

    hooks.pre('cook', function(next) {
      ++called;
      next();
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

  it('handles async errors', async function() {
    const execed = {};

    hooks.pre('cook', true, function(next, done) {
      execed.first = true;
      setTimeout(
        function() {
          done('error!');
        },
        5);

      next();
    });

    hooks.pre('cook', true, function(next, done) {
      execed.second = true;
      setTimeout(
        function() {
          done('other error!');
        },
        10);

      next();
    });

    const err = await hooks.execPre('cook', null).then(() => null, err => err);
    assert.equal('error!', err);
    assert.equal(2, Object.keys(execed).length);
    assert.ok(execed.first);
    assert.ok(execed.second);
  });

  it('handles async errors in next()', async function() {
    const execed = {};

    hooks.pre('cook', true, function(next, done) {
      execed.first = true;
      setTimeout(
        function() {
          done('other error!');
        },
        15);

      next();
    });

    hooks.pre('cook', true, function(next, done) {
      execed.second = true;
      setTimeout(
        function() {
          next('error!');
          done('another error!');
        },
        5);
    });

    const err = await hooks.execPre('cook', null).then(() => null, err => err);
    assert.equal('error!', err);
    assert.equal(2, Object.keys(execed).length);
    assert.ok(execed.first);
    assert.ok(execed.second);
  });

  it('handles async errors in next() when already done', async function() {
    const execed = {};

    hooks.pre('cook', true, function(next, done) {
      execed.first = true;
      setTimeout(
        function() {
          done('other error!');
        },
        5);

      next();
    });

    hooks.pre('cook', true, function(next, done) {
      execed.second = true;
      setTimeout(
        function() {
          next();
          done('another error!');
        },
        25);
    });

    const err = await hooks.execPre('cook', null).then(() => null, err => err);
    assert.equal('other error!', err);
    assert.equal(2, Object.keys(execed).length);
    assert.ok(execed.first);
    assert.ok(execed.second);
  });

  it('async pres with clone()', async function() {
    let execed = false;

    hooks.pre('cook', true, function(next, done) {
      execed = true;
      setTimeout(
        function() {
          done();
        },
        5);

      next();
    });

    await hooks.clone().execPre('cook', null);
    assert.ok(execed);
  });

  it('returns correct error when async pre errors', async function() {
    const execed = {};

    hooks.pre('cook', true, function(next, done) {
      execed.first = true;
      setTimeout(
        function() {
          done('other error!');
        },
        5);

      next();
    });

    hooks.pre('cook', function(next) {
      execed.second = true;
      setTimeout(
        function() {
          next('error!');
        },
        15);
    });

    const err = await hooks.execPre('cook', null).then(() => null, err => err);
    // In kareem@3.x, `next()` errors take precedence over `done()` errors
    assert.equal('error!', err);
    assert.equal(2, Object.keys(execed).length);
    assert.ok(execed.first);
    assert.ok(execed.second);
  });

  it('lets async pres run when fully sync pres are done', async function() {
    const execed = {};

    hooks.pre('cook', true, function(next, done) {
      execed.first = true;
      setTimeout(
        function() {
          done();
        },
        5);

      next();
    });

    hooks.pre('cook', function() {
      execed.second = true;
    });

    await hooks.execPre('cook', null);
    assert.equal(2, Object.keys(execed).length);
    assert.ok(execed.first);
    assert.ok(execed.second);
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

    hooks.pre('cook', function(callback) {
      callback(Kareem.skipWrappedFunction(42));
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
