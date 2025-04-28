'use strict';

const assert = require('assert');
const Kareem = require('../');
const { beforeEach, describe, it } = require('mocha');

describe('wrap()', function() {
  let hooks;

  beforeEach(function() {
    hooks = new Kareem();
  });

  it('handles pre errors', async function() {
    hooks.pre('cook', function(done) {
      done('error!');
    });

    hooks.post('cook', function(obj) {
      obj.tofu = 'no';
    });

    const obj = { bacon: 0, eggs: 0 };

    await assert.rejects(async() => {
      await hooks.wrap(
        'cook',
        function(o) {
          // Should never get called
          assert.ok(false);
          return o;
        },
        obj,
        [obj]);
    }, err => {
      assert.equal(err, 'error!');
      assert.equal(obj.tofu, undefined);
      return true;
    });
  });

  it('handles pre errors when no callback defined', async function() {
    hooks.pre('cook', function(done) {
      done('error!');
    });

    hooks.post('cook', function(obj) {
      obj.tofu = 'no';
    });

    const obj = { bacon: 0, eggs: 0 };

    const args = [obj];

    await assert.rejects(async() => {
      await hooks.wrap(
        'cook',
        function(o) {
          // Should never get called
          assert.ok(false);
          return o;
        },
        obj,
        args);
    }, err => {
      assert.equal(err, 'error!');
      assert.equal(obj.tofu, undefined);
      return true;
    });
  });

  it('handles errors in wrapped function', async function() {
    hooks.pre('cook', function(done) {
      done();
    });

    hooks.post('cook', function(obj) {
      obj.tofu = 'no';
    });

    const obj = { bacon: 0, eggs: 0 };

    const args = [obj];

    await assert.rejects(async() => {
      await hooks.wrap(
        'cook',
        function() {
          throw new Error('error!');
        },
        obj,
        args);
    }, err => {
      assert.equal(err.message, 'error!');
      assert.equal(obj.tofu, undefined);
      return true;
    });
  });

  it('handles errors in post', async function() {
    hooks.pre('cook', function(done) {
      done();
    });

    hooks.post('cook', function(obj, callback) {
      obj.tofu = 'no';
      callback(new Error('error!'));
    });

    const obj = { bacon: 0, eggs: 0 };

    const args = [obj];

    await assert.rejects(async() => {
      await hooks.wrap(
        'cook',
        function(o) {
          return o;
        },
        obj,
        args);
    }, err => {
      assert.equal(err.message, 'error!');
      assert.equal(obj.tofu, 'no');
      return true;
    });
  });

  it('defers errors to post hooks if enabled', async function() {
    hooks.pre('cook', function(done) {
      done(new Error('fail'));
    });

    hooks.post('cook', function(error, res, callback) {
      callback(new Error('another error occurred'));
    });

    await assert.rejects(async() => {
      await hooks.wrap(
        'cook',
        function() {
          assert.ok(false);
        },
        null,
        [],
        { numCallbackParams: 1 });
    }, err => {
      assert.equal(err.message, 'another error occurred');
      return true;
    });
  });

  it('error handlers with no callback', async function() {
    hooks.pre('cook', function(done) {
      done(new Error('fail'));
    });

    hooks.postError('cook', function(error) {
      assert.equal(error.message, 'fail');
    });

    const args = [];

    await assert.rejects(async() => {
      await hooks.wrap(
        'cook',
        function() {
          assert.ok(false);
        },
        null,
        args);
    }, /fail/);
  });

  it('error handlers do not execute with no error', async function() {
    hooks.post('cook', function(error, res, callback) {
      callback(new Error('another error occurred'));
    });

    await hooks.wrap(
      'cook',
      async function() {
        return;
      },
      null,
      []
    );
  });

  it('works with no args', async function() {
    hooks.pre('cook', function(done) {
      done();
    });

    hooks.post('cook', function(res, callback) {
      obj.tofu = 'no';
      callback();
    });

    const obj = { bacon: 0, eggs: 0 };

    const args = [];

    await hooks.wrap(
      'cook',
      async function() {
        return null;
      },
      obj,
      args);

    assert.equal(obj.tofu, 'no');
  });

  it('handles pre errors with no args', async function() {
    hooks.pre('cook', function(done) {
      done(new Error('error!'));
    });

    hooks.post('cook', function(callback) {
      obj.tofu = 'no';
      callback();
    });

    const obj = { bacon: 0, eggs: 0 };

    const args = [];

    await assert.rejects(async() => {
      await hooks.wrap(
        'cook',
        function() {
          return null;
        },
        obj,
        args);
    }, err => {
      assert.equal(err.message, 'error!');
      assert.equal(obj.tofu, undefined);
      return true;
    });
  });

  it('handles wrapped function errors with no args', async function() {
    hooks.pre('cook', function(done) {
      obj.waffles = false;
      done();
    });

    hooks.post('cook', function(callback) {
      obj.tofu = 'no';
      callback();
    });

    const obj = { bacon: 0, eggs: 0 };

    const args = [];

    await assert.rejects(async() => {
      await hooks.wrap(
        'cook',
        function() {
          throw new Error('error!');
        },
        obj,
        args);
    }, err => {
      assert.equal(err.message, 'error!');
      assert.equal(obj.waffles, false);
      assert.equal(obj.tofu, undefined);
      return true;
    });
  });

  it('supports overwriteResult', async function() {
    hooks.post('cook', function(res, callback) {
      callback(Kareem.overwriteResult(5));
    });

    const result = await hooks.wrap(
      'cook',
      function() {
        return 4;
      },
      null,
      []);

    assert.equal(result, 5);
  });

  it('supports skipWrappedFunction', async function() {
    const execed = {};
    hooks.pre('cook', function pre(callback) {
      execed.pre = true;
      callback(Kareem.skipWrappedFunction(3));
    });

    hooks.post('cook', function(res, callback) {
      assert.equal(res, 3);
      execed.post = true;
      callback();
    });

    const result = await hooks.wrap(
      'cook',
      function wrapped() {
        execed.wrapped = true;
      },
      null,
      []);

    assert.equal(result, 3);
    assert.ok(execed.pre);
    assert.ok(execed.post);
    assert.ok(!execed.wrapped);
  });

  it('supports skipWrappedFunction with arguments', async function() {
    const execed = {};
    hooks.pre('cook', function pre(callback, arg) {
      execed.pre = true;
      assert.strictEqual(4, arg);

      callback(Kareem.skipWrappedFunction(3));
    });

    hooks.post('cook', function(res, callback) {
      assert.equal(3, res);
      execed.post = true;
      callback();
    });

    const args = [4];

    const result = await hooks.wrap(
      'cook',
      function wrapped() {
        execed.wrapped = true;
        return null;
      },
      null,
      args
    );

    assert.equal(result, 3);
    assert.ok(execed.pre);
    assert.ok(execed.post);
    assert.ok(!execed.wrapped);
  });

  it('handles post errors with no args', async function() {
    hooks.pre('cook', function(done) {
      obj.waffles = false;
      done();
    });

    hooks.post('cook', function(res, callback) {
      obj.tofu = 'no';
      callback(new Error('error!'));
    });

    const obj = { bacon: 0, eggs: 0 };

    const args = [];

    await assert.rejects(async() => {
      await hooks.wrap(
        'cook',
        function() {
          return;
        },
        obj,
        args);
    }, err => {
      assert.equal(err.message, 'error!');
      assert.equal(obj.waffles, false);
      assert.equal(obj.tofu, 'no');
      return true;
    });
  });

  it('catches sync errors', async function() {
    hooks.pre('cook', function(done) {
      done();
    });

    hooks.post('cook', function(callback) {
      callback();
    });

    await assert.rejects(async() => {
      await hooks.wrap(
        'cook',
        function() {
          throw new Error('oops!');
        },
        null,
        []);
    }, err => {
      assert.equal(err.message, 'oops!');
      return true;
    });
  });

  it('sync wrappers', function() {
    let calledPre = 0;
    let calledFn = 0;
    let calledPost = 0;
    hooks.pre('cook', function() {
      ++calledPre;
    });

    hooks.post('cook', function() {
      ++calledPost;
    });

    const wrapper = hooks.createWrapperSync('cook', function() { ++calledFn; });

    wrapper();

    assert.equal(calledPre, 1);
    assert.equal(calledFn, 1);
    assert.equal(calledPost, 1);
  });

  it('sync wrappers with overwriteResult', function() {
    hooks.pre('cook', function() {
    });

    hooks.post('cook', function() {
      return Kareem.overwriteResult(5);
    });

    const wrapper = hooks.createWrapperSync('cook', function() { return 4; });

    assert.strictEqual(wrapper(), 5);
  });
});
