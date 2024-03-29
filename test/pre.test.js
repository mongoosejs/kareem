'use strict';

const assert = require('assert');
const Kareem = require('../');
const { beforeEach, describe, it } = require('mocha');

describe('execPre', function() {
  let hooks;

  beforeEach(function() {
    hooks = new Kareem();
  });

  it('handles errors with multiple pres', function(done) {
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

    hooks.execPre('cook', null, function(err) {
      assert.equal('error!', err);
      assert.equal(2, Object.keys(execed).length);
      assert.ok(execed.first);
      assert.ok(execed.second);
      done();
    });
  });

  it('sync errors', function(done) {
    let called = 0;

    hooks.pre('cook', function() {
      throw new Error('woops!');
    });

    hooks.pre('cook', function(next) {
      ++called;
      next();
    });

    hooks.execPre('cook', null, function(err) {
      assert.equal(err.message, 'woops!');
      assert.equal(called, 0);
      done();
    });
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

  it('handles async errors', function(done) {
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

    hooks.execPre('cook', null, function(err) {
      assert.equal('error!', err);
      assert.equal(2, Object.keys(execed).length);
      assert.ok(execed.first);
      assert.ok(execed.second);
      done();
    });
  });

  it('handles async errors in next()', function(done) {
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

    hooks.execPre('cook', null, function(err) {
      assert.equal('error!', err);
      assert.equal(2, Object.keys(execed).length);
      assert.ok(execed.first);
      assert.ok(execed.second);
      done();
    });
  });

  it('handles async errors in next() when already done', function(done) {
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
          next('error!');
          done('another error!');
        },
        25);
    });

    hooks.execPre('cook', null, function(err) {
      assert.equal('other error!', err);
      assert.equal(2, Object.keys(execed).length);
      assert.ok(execed.first);
      assert.ok(execed.second);
      done();
    });
  });

  it('async pres with clone()', function(done) {
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

    hooks.clone().execPre('cook', null, function(err) {
      assert.ifError(err);
      assert.ok(execed);
      done();
    });
  });

  it('returns correct error when async pre errors', function(done) {
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

    hooks.execPre('cook', null, function(err) {
      assert.equal('other error!', err);
      assert.equal(2, Object.keys(execed).length);
      assert.ok(execed.first);
      assert.ok(execed.second);
      done();
    });
  });

  it('lets async pres run when fully sync pres are done', function(done) {
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

    hooks.execPre('cook', null, function(err) {
      assert.ifError(err);
      assert.equal(2, Object.keys(execed).length);
      assert.ok(execed.first);
      assert.ok(execed.second);
      done();
    });
  });

  it('allows passing arguments to the next pre', function(done) {
    const execed = {};

    hooks.pre('cook', function(next) {
      execed.first = true;
      next(null, 'test');
    });

    hooks.pre('cook', function(next, p) {
      execed.second = true;
      assert.equal(p, 'test');
      next();
    });

    hooks.pre('cook', function(next, p) {
      execed.third = true;
      assert.ok(!p);
      next();
    });

    hooks.execPre('cook', null, function(err) {
      assert.ifError(err);
      assert.equal(3, Object.keys(execed).length);
      assert.ok(execed.first);
      assert.ok(execed.second);
      assert.ok(execed.third);
      done();
    });
  });

  it('avoids passing final callback to pre', function(done) {
    const execed = {};

    hooks.pre('cook', function(next) {
      execed.first = true;
      assert.equal(arguments.length, 1);
      next(null, 'test');
    });

    hooks.pre('cook', function(next, p, _cb) {
      execed.second = true;
      assert.equal(p, 'test');
      assert.equal(arguments.length, 2);
      next();
    });

    hooks.pre('cook', function(next, p) {
      execed.third = true;
      assert.ok(!p);
      assert.equal(arguments.length, 1);
      next();
    });

    hooks.execPre('cook', null, [finalCb], function(err) {
      assert.ifError(err);
      assert.equal(3, Object.keys(execed).length);
      assert.ok(execed.first);
      assert.ok(execed.second);
      assert.ok(execed.third);
      done();
    });

    function finalCb() {}
  });

  it('handles sync errors in pre if there are more hooks', function(done) {
    const execed = {};

    hooks.pre('cook', function() {
      execed.first = true;
      throw new Error('Oops!');
    });

    hooks.pre('cook', function() {
      execed.second = true;
    });

    hooks.execPre('cook', null, function(err) {
      assert.ok(err);
      assert.ok(execed.first);
      assert.equal(err.message, 'Oops!');
      done();
    });
  });

  it('supports skipWrappedFunction', function(done) {
    const execed = {};

    hooks.pre('cook', function(callback) {
      callback(Kareem.skipWrappedFunction(42));
    });

    hooks.pre('cook', function() {
      execed.second = true;
    });

    hooks.execPre('cook', null, function(err) {
      assert.ok(execed.second);
      assert.ok(err instanceof Kareem.skipWrappedFunction);
      done();
    });
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
