'use strict';

const assert = require('assert');
const Kareem = require('../');
const { beforeEach, describe, it } = require('mocha');

describe('execPost', function() {
  let hooks;

  beforeEach(function() {
    hooks = new Kareem();
  });

  it('handles errors', async function() {
    hooks.post('cook', function(eggs, callback) {
      callback('error!');
    });

    await assert.rejects(
      () => hooks.execPost('cook', null, [4]),
      error => error === 'error!'
    );
  });

  it('unshift', function() {
    const f1 = function() {};
    const f2 = function() {};
    hooks.post('cook', f1);
    hooks.post('cook', f2, true);
    assert.strictEqual(hooks._posts.get('cook')[0].fn, f2);
    assert.strictEqual(hooks._posts.get('cook')[1].fn, f1);
  });

  it('arbitrary options', function() {
    const f1 = function() {};
    const f2 = function() {};
    hooks.post('cook', { foo: 'bar' }, f1);
    hooks.post('cook', { bar: 'baz' }, f2, true);
    assert.equal(hooks._posts.get('cook')[1].foo, 'bar');
    assert.equal(hooks._posts.get('cook')[0].bar, 'baz');
  });

  it('throws error if no function', function() {
    assert.throws(() => hooks.post('test'), /got "undefined"/);
  });

  it('multiple posts', async function() {
    hooks.post('cook', function(eggs, callback) {
      setTimeout(
        function() {
          callback();
        },
        5);
    });

    hooks.post('cook', function(eggs, callback) {
      setTimeout(
        function() {
          callback();
        },
        5);
    });

    const eggs = await hooks.execPost('cook', null, [4]);
    assert.equal(eggs, 4);
  });

  it('error posts', async function() {
    const called = {};
    hooks.post('cook', function(eggs, callback) {
      called.first = true;
      callback();
    });

    hooks.post('cook', function(eggs, callback) {
      called.second = true;
      callback(new Error('fail'));
    });

    hooks.post('cook', function() {
      assert.ok(false);
    });

    hooks.post('cook', function(error, eggs, callback) {
      called.fourth = true;
      assert.equal(error.message, 'fail');
      callback(new Error('fourth'));
    });

    hooks.post('cook', function(error, eggs, callback) {
      called.fifth = true;
      assert.equal(error.message, 'fourth');
      callback(new Error('fifth'));
    });

    const err = await hooks.execPost('cook', null, [4]).then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.message, 'fifth');
    assert.deepEqual(called, {
      first: true,
      second: true,
      fourth: true,
      fifth: true
    });
  });

  it('error posts with errorHandler option', async function() {
    const called = {};
    hooks.post('cook', function(eggs, callback) {
      called.first = true;
      callback();
    });

    hooks.post('cook', function(eggs, callback) {
      called.second = true;
      callback(new Error('fail'));
    });

    hooks.post('cook', function() {
      assert.ok(false);
    });

    hooks.post('cook', { errorHandler: true }, function() {
      called.fourth = true;
      return Promise.resolve();
    });

    const err = await hooks.execPost('cook', null, [4]).then(() => null, err => err);
    assert.ok(err);
    assert.deepEqual(called, {
      first: true,
      second: true,
      fourth: true
    });
  });

  it('error posts with initial error', async function() {
    const called = {};

    hooks.post('cook', function() {
      assert.ok(false);
    });

    hooks.post('cook', function(error, eggs, callback) {
      called.second = true;
      assert.equal(error.message, 'fail');
      callback(new Error('second'));
    });

    hooks.post('cook', function(error, eggs, callback) {
      called.third = true;
      assert.equal(error.message, 'second');
      callback(new Error('third'));
    });

    hooks.post('cook', function(error, eggs, callback) {
      called.fourth = true;
      assert.equal(error.message, 'third');
      callback();
    });

    const options = { error: new Error('fail') };
    const err = await hooks.execPost('cook', null, [4], options).then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.message, 'third');
    assert.deepEqual(called, {
      second: true,
      third: true,
      fourth: true
    });
  });

  it('supports returning a promise', async function() {
    let calledPost = 0;

    hooks.post('cook', function() {
      return new Promise(resolve => {
        setTimeout(() => {
          ++calledPost;
          resolve();
        }, 100);
      });
    });

    await hooks.execPost('cook', null, [], {});
    assert.equal(calledPost, 1);
  });

  it('supports overwriteResult', async function() {
    hooks.post('cook', function(eggs, callback) {
      callback(Kareem.overwriteResult(5));
    });

    hooks.post('cook', function(eggs, callback) {
      assert.equal(eggs, 5);
      callback();
    });

    const options = {};
    const eggs = await hooks.execPost('cook', null, [4], options);
    assert.equal(eggs, 5);
  });

  it('supports sync returning overwriteResult', async function() {
    hooks.post('cook', function() {
      return Kareem.overwriteResult(5);
    });

    hooks.post('cook', function(eggs, callback) {
      assert.equal(eggs, 5);
      callback();
    });

    const options = {};
    const eggs = await hooks.execPost('cook', null, [4], options);
    assert.equal(eggs, 5);
  });

  it('supports sync overwriteResult', function() {
    hooks.post('cook', function() {
      return Kareem.overwriteResult(5);
    });

    hooks.post('cook', function(eggs) {
      assert.equal(eggs, 5);
    });

    const options = {};
    const res = hooks.execPostSync('cook', null, [4], options);
    assert.deepEqual(res, [5]);
  });

  it('supports overwriteResult with promises', async function() {
    hooks.post('cook', function() {
      return Promise.resolve(Kareem.overwriteResult(5));
    });

    hooks.post('cook', function(eggs) {
      assert.equal(eggs, 5);
    });

    const options = {};
    const eggs = await hooks.execPost('cook', null, [4], options);
    assert.equal(eggs, 5);
  });
});

describe('execPostSync', function() {
  let hooks;

  beforeEach(function() {
    hooks = new Kareem();
  });

  it('executes hooks synchronously', function() {
    const execed = {};

    hooks.post('cook', function() {
      execed.first = true;
    });

    hooks.post('cook', function() {
      execed.second = true;
    });

    hooks.execPostSync('cook', null);
    assert.ok(execed.first);
    assert.ok(execed.second);
  });

  it('works with no hooks specified', function() {
    assert.doesNotThrow(function() {
      hooks.execPostSync('cook', null);
    });
  });
});
