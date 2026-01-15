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
    hooks.pre('cook', function() {
      throw new Error('error!');
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
      assert.equal(err.message, 'error!');
      assert.equal(obj.tofu, undefined);
      return true;
    });
  });

  it('handles pre errors when no callback defined', async function() {
    hooks.pre('cook', function() {
      throw new Error('error!');
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
      assert.equal(err.message, 'error!');
      assert.equal(obj.tofu, undefined);
      return true;
    });
  });

  it('handles errors in wrapped function', async function() {
    hooks.pre('cook', function() {});

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
    hooks.pre('cook', function() {});

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
    hooks.pre('cook', function() {
      throw new Error('fail');
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
    hooks.pre('cook', function() {
      throw new Error('fail');
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
    hooks.pre('cook', function() {});

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
    hooks.pre('cook', function() {
      throw new Error('error!');
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
    hooks.pre('cook', function() {
      obj.waffles = false;
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
    hooks.pre('cook', function pre() {
      execed.pre = true;
      throw Kareem.skipWrappedFunction(3);
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
    hooks.pre('cook', function pre(arg) {
      execed.pre = true;
      assert.strictEqual(4, arg);
      throw Kareem.skipWrappedFunction(3);
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
    hooks.pre('cook', function() {
      obj.waffles = false;
    });

    hooks.post('cook', function(res, callback) {
      obj.tofu = 'no';
      callback(new Error('error!'));
    });

    const obj = { bacon: 0, eggs: 0 };

    const args = [];

    const err = await hooks.wrap(
      'cook',
      function() {
        return;
      },
      obj,
      args
    ).then(() => null, err => err);

    assert.equal(err.message, 'error!');
    assert.equal(obj.waffles, false);
    assert.equal(obj.tofu, 'no');
  });

  it('catches sync errors', async function() {
    hooks.pre('cook', function() {});

    hooks.post('cook', function() {});

    const err = await hooks.wrap(
      'cook',
      function() {
        throw new Error('oops!');
      },
      null,
      []
    ).then(() => null, err => err);

    assert.equal(err.message, 'oops!');
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

  it('supports overwriteArguments in wrap()', async function() {
    const execed = {};
    hooks.pre('init', function(obj) {
      execed.pre = true;
      if (typeof obj === 'string') {
        return Kareem.overwriteArguments({ name: obj });
      }
    });

    const result = await hooks.wrap(
      'init',
      function(obj) {
        execed.wrapped = true;
        assert.strictEqual(typeof obj, 'object');
        assert.strictEqual(obj.name, 'test');
        return obj;
      },
      null,
      ['test']);

    assert.ok(execed.pre);
    assert.ok(execed.wrapped);
    assert.deepStrictEqual(result, { name: 'test' });
  });

  it('supports overwriteArguments with throw in wrap()', async function() {
    const execed = {};
    hooks.pre('init', function(obj) {
      execed.pre = true;
      if (typeof obj === 'string') {
        throw Kareem.overwriteArguments({ name: obj });
      }
    });

    const result = await hooks.wrap(
      'init',
      function(obj) {
        execed.wrapped = true;
        assert.strictEqual(typeof obj, 'object');
        assert.strictEqual(obj.name, 'test');
        return obj;
      },
      null,
      ['test']);

    assert.ok(execed.pre);
    assert.ok(execed.wrapped);
    assert.deepStrictEqual(result, { name: 'test' });
  });

  it('supports overwriteArguments with multiple pre hooks', async function() {
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

    const result = await hooks.wrap(
      'init',
      function(obj) {
        assert.strictEqual(typeof obj, 'object');
        assert.strictEqual(obj.name, 'test');
        assert.strictEqual(obj.modified, true);
        return obj;
      },
      null,
      ['test']);

    assert.deepStrictEqual(result, { name: 'test', modified: true });
  });

  it('supports overwriteArguments in sync wrappers', function() {
    hooks.pre('cook', function(obj) {
      if (typeof obj === 'string') {
        return Kareem.overwriteArguments({ name: obj });
      }
    });

    const wrapper = hooks.createWrapperSync('cook', function(obj) {
      assert.strictEqual(typeof obj, 'object');
      assert.strictEqual(obj.name, 'hello');
      return obj;
    });

    const result = wrapper('hello');
    assert.deepStrictEqual(result, { name: 'hello' });
  });

  it('supports overwriteArguments with multiple arguments', async function() {
    hooks.pre('process', function(a, b, c) {
      return Kareem.overwriteArguments(a + 1, b + 2, c + 3);
    });

    const result = await hooks.wrap(
      'process',
      function(a, b, c) {
        assert.strictEqual(a, 2);
        assert.strictEqual(b, 4);
        assert.strictEqual(c, 6);
        return a + b + c;
      },
      null,
      [1, 2, 3]);

    assert.strictEqual(result, 12);
  });

  it('sync wrappers support getOptions to filter hooks', function() {
    const execed = [];

    const fn1 = function() { execed.push('pre1'); };
    fn1.skipMe = true;
    hooks.pre('init', fn1);

    const fn2 = function() { execed.push('pre2'); };
    hooks.pre('init', fn2);

    const postFn1 = function() { execed.push('post1'); };
    postFn1.skipMe = true;
    hooks.post('init', postFn1);

    const postFn2 = function() { execed.push('post2'); };
    hooks.post('init', postFn2);

    const wrapper = hooks.createWrapperSync('init', function(doc) {
      execed.push('fn');
      return doc;
    }, null, {
      getOptions: (args) => {
        const opts = args[1] || {};
        if (opts.skipMiddleware) {
          return { filter: hook => !hook.fn.skipMe };
        }
        return {};
      }
    });

    // Without skipMiddleware option, all hooks run
    wrapper({ name: 'test' }, {});
    assert.deepStrictEqual(execed, ['pre1', 'pre2', 'fn', 'post1', 'post2']);

    // With skipMiddleware option, filtered hooks are skipped
    execed.length = 0;
    wrapper({ name: 'test' }, { skipMiddleware: true });
    assert.deepStrictEqual(execed, ['pre2', 'fn', 'post2']);
  });

  it('sync wrappers support separate pre/post options from getOptions', function() {
    const execed = [];

    const fn1 = function() { execed.push('pre1'); };
    fn1.skipMe = true;
    hooks.pre('init', fn1);

    const fn2 = function() { execed.push('pre2'); };
    hooks.pre('init', fn2);

    const postFn1 = function() { execed.push('post1'); };
    postFn1.skipMe = true;
    hooks.post('init', postFn1);

    const postFn2 = function() { execed.push('post2'); };
    hooks.post('init', postFn2);

    const wrapper = hooks.createWrapperSync('init', function(doc) {
      execed.push('fn');
      return doc;
    }, null, {
      getOptions: (args) => {
        const opts = args[1] || {};
        return {
          pre: opts.skipPre ? { filter: hook => !hook.fn.skipMe } : {},
          post: opts.skipPost ? { filter: hook => !hook.fn.skipMe } : {}
        };
      }
    });

    // Skip only pre hooks
    wrapper({ name: 'test' }, { skipPre: true });
    assert.deepStrictEqual(execed, ['pre2', 'fn', 'post1', 'post2']);

    // Skip only post hooks
    execed.length = 0;
    wrapper({ name: 'test' }, { skipPost: true });
    assert.deepStrictEqual(execed, ['pre1', 'pre2', 'fn', 'post2']);
  });

  it('sync wrappers use provided context over calling context', function() {
    const providedContext = { name: 'provided' };
    const callingContext = { name: 'calling' };
    let preContext = null;
    let fnContext = null;
    let postContext = null;

    hooks.pre('init', function() {
      preContext = this;
    });

    hooks.post('init', function() {
      postContext = this;
    });

    const wrapper = hooks.createWrapperSync('init', function() {
      fnContext = this;
      return 'result';
    }, providedContext);

    wrapper.call(callingContext);

    assert.strictEqual(preContext, providedContext);
    assert.strictEqual(fnContext, providedContext);
    assert.strictEqual(postContext, providedContext);
  });

  it('sync wrappers fall back to calling context when context is null', function() {
    const callingContext = { name: 'calling' };
    let preContext = null;
    let fnContext = null;
    let postContext = null;

    hooks.pre('init', function() {
      preContext = this;
    });

    hooks.post('init', function() {
      postContext = this;
    });

    const wrapper = hooks.createWrapperSync('init', function() {
      fnContext = this;
      return 'result';
    }, null);

    wrapper.call(callingContext);

    assert.strictEqual(preContext, callingContext);
    assert.strictEqual(fnContext, callingContext);
    assert.strictEqual(postContext, callingContext);
  });
});
