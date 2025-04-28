'use strict';

const assert = require('assert');
const { beforeEach, describe, it } = require('mocha');
const Kareem = require('../');

// NOTE: this file has some empty comment lines to workaround https://github.com/vkarpov15/acquit/issues/30

/* Much like [hooks](https://npmjs.org/package/hooks), kareem lets you define
 * pre and post hooks: pre hooks are called before a given function executes.
 * Unlike hooks, kareem stores hooks and other internal state in a separate
 * object, rather than relying on inheritance. Furthermore, kareem exposes
 * an `execPre()` function that allows you to execute your pre hooks when
 * appropriate, giving you more fine-grained control over your function hooks.
 */
describe('pre hooks', function() {
  let hooks;

  beforeEach(function() {
    hooks = new Kareem();
  });

  it('runs without any hooks specified', async function() {
    await hooks.execPre('cook', null);
  });

  /* pre hook functions take one parameter, a "done" function that you execute
   * when your pre hook is finished.
   */
  it('runs basic serial pre hooks', async function() {
    let count = 0;

    hooks.pre('cook', function(done) {
      ++count;
      done();
    });

    await hooks.execPre('cook', null);
    assert.equal(1, count);
  });

  it('can run multiple pre hooks', async function() {
    let count1 = 0;
    let count2 = 0;

    hooks.pre('cook', function(done) {
      ++count1;
      done();
    });

    hooks.pre('cook', function(done) {
      ++count2;
      done();
    });

    await hooks.execPre('cook', null);
    assert.equal(1, count1);
    assert.equal(1, count2);
  });

  /* If your pre hook function takes no parameters, its assumed to be
   * fully synchronous.
   */
  it('can run fully synchronous pre hooks', async function() {
    let count1 = 0;
    let count2 = 0;

    hooks.pre('cook', function() {
      ++count1;
    });

    hooks.pre('cook', function() {
      ++count2;
    });

    await hooks.execPre('cook', null);
    assert.equal(1, count1);
    assert.equal(1, count2);
  });

  /* Pre save hook functions are bound to the second parameter to `execPre()`
   */
  it('properly attaches context to pre hooks', async function() {
    hooks.pre('cook', function(done) {
      this.bacon = 3;
      done();
    });

    hooks.pre('cook', function(done) {
      this.eggs = 4;
      done();
    });

    const obj = { bacon: 0, eggs: 0 };

    // In the pre hooks, `this` will refer to `obj`
    await hooks.execPre('cook', obj);
    assert.equal(3, obj.bacon);
    assert.equal(4, obj.eggs);
  });

  /* Like the hooks module, you can declare "async" pre hooks - these take two
   * parameters, the functions `next()` and `done()`. `next()` passes control to
   * the next pre hook, but the underlying function won't be called until all
   * async pre hooks have called `done()`.
   */
  it('can execute parallel (async) pre hooks', async function() {
    hooks.pre('cook', true, function(next, done) {
      this.bacon = 3;
      next();
      setTimeout(function() {
        done();
      }, 5);
    });

    hooks.pre('cook', true, function(next, done) {
      next();
      const _this = this;
      setTimeout(function() {
        _this.eggs = 4;
        done();
      }, 10);
    });

    hooks.pre('cook', function(next) {
      this.waffles = false;
      next();
    });

    const obj = { bacon: 0, eggs: 0 };

    await hooks.execPre('cook', obj);
    assert.equal(3, obj.bacon);
    assert.equal(4, obj.eggs);
    assert.equal(false, obj.waffles);
  });

  /* You can also return a promise from your pre hooks instead of calling
   * `next()`. When the returned promise resolves, kareem will kick off the
   * next middleware.
   */
  it('supports returning a promise', async function() {
    hooks.pre('cook', function() {
      return new Promise(resolve => {
        setTimeout(() => {
          this.bacon = 3;
          resolve();
        }, 100);
      });
    });

    const obj = { bacon: 0 };

    await hooks.execPre('cook', obj);
    assert.equal(3, obj.bacon);
  });
});

//
describe('post hooks', function() {
  let hooks;

  beforeEach(function() {
    hooks = new Kareem();
  });

  it('runs without any hooks specified', async function() {
    const [eggs] = await hooks.execPost('cook', null, [1]);
    assert.equal(eggs, 1);
  });

  it('executes with parameters passed in', async function() {
    hooks.post('cook', function(eggs, bacon, callback) {
      assert.equal(eggs, 1);
      assert.equal(bacon, 2);
      callback();
    });

    const [eggs, bacon] = await hooks.execPost('cook', null, [1, 2]);
    assert.equal(eggs, 1);
    assert.equal(bacon, 2);
  });

  it('can use synchronous post hooks', async function() {
    const execed = {};

    hooks.post('cook', function(eggs, bacon) {
      execed.first = true;
      assert.equal(eggs, 1);
      assert.equal(bacon, 2);
    });

    hooks.post('cook', function(eggs, bacon, callback) {
      execed.second = true;
      assert.equal(eggs, 1);
      assert.equal(bacon, 2);
      callback();
    });

    const [eggs, bacon] = await hooks.execPost('cook', null, [1, 2]);
    assert.equal(Object.keys(execed).length, 2);
    assert.ok(execed.first);
    assert.ok(execed.second);
    assert.equal(eggs, 1);
    assert.equal(bacon, 2);
  });

  /* You can also return a promise from your post hooks instead of calling
   * `next()`. When the returned promise resolves, kareem will kick off the
   * next middleware.
   */
  it('supports returning a promise', async function() {
    hooks.post('cook', function() {
      return new Promise(resolve => {
        setTimeout(() => {
          this.bacon = 3;
          resolve();
        }, 100);
      });
    });

    const obj = { bacon: 0 };

    await hooks.execPost('cook', obj, [obj]);
    assert.equal(obj.bacon, 3);
  });
});

//
describe('wrap()', function() {
  let hooks;

  beforeEach(function() {
    hooks = new Kareem();
  });

  it('wraps pre and post calls into one call', async function() {
    hooks.pre('cook', true, function(next, done) {
      this.bacon = 3;
      next();
      setTimeout(function() {
        done();
      }, 5);
    });

    hooks.pre('cook', true, function(next, done) {
      next();
      const _this = this;
      setTimeout(function() {
        _this.eggs = 4;
        done();
      }, 10);
    });

    hooks.pre('cook', function(next) {
      this.waffles = false;
      next();
    });

    hooks.post('cook', function(obj) {
      obj.tofu = 'no';
    });

    const obj = { bacon: 0, eggs: 0 };

    const args = [obj];

    const result = await hooks.wrap(
      'cook',
      function(o) {
        assert.equal(obj.bacon, 3);
        assert.equal(obj.eggs, 4);
        assert.equal(obj.waffles, false);
        assert.equal(obj.tofu, undefined);
        return o;
      },
      obj,
      args);

    assert.equal(obj.bacon, 3);
    assert.equal(obj.eggs, 4);
    assert.equal(obj.waffles, false);
    assert.equal(obj.tofu, 'no');
    assert.equal(result, obj);
  });
});

//
describe('createWrapper()', function() {
  let hooks;

  beforeEach(function() {
    hooks = new Kareem();
  });

  it('wraps wrap() into a callable function', async function() {
    hooks.pre('cook', true, function(next, done) {
      this.bacon = 3;
      next();
      setTimeout(function() {
        done();
      }, 5);
    });

    hooks.pre('cook', true, function(next, done) {
      next();
      const _this = this;
      setTimeout(function() {
        _this.eggs = 4;
        done();
      }, 10);
    });

    hooks.pre('cook', function(next) {
      this.waffles = false;
      next();
    });

    hooks.post('cook', function(obj) {
      obj.tofu = 'no';
    });

    const obj = { bacon: 0, eggs: 0 };

    const cook = hooks.createWrapper(
      'cook',
      function(o) {
        assert.equal(3, obj.bacon);
        assert.equal(4, obj.eggs);
        assert.equal(false, obj.waffles);
        assert.equal(undefined, obj.tofu);
        return o;
      },
      obj);

    const result = await cook(obj);
    assert.equal(obj.bacon, 3);
    assert.equal(obj.eggs, 4);
    assert.equal(obj.waffles, false);
    assert.equal(obj.tofu, 'no');

    assert.equal(result, obj);
  });
});

//
describe('clone()', function() {
  it('clones a Kareem object', function() {
    const k1 = new Kareem();
    k1.pre('cook', function() {});
    k1.post('cook', function() {});

    const k2 = k1.clone();
    assert.deepEqual(Array.from(k2._pres.keys()), ['cook']);
    assert.deepEqual(Array.from(k2._posts.keys()), ['cook']);
  });
});

//
describe('merge()', function() {
  it('pulls hooks from another Kareem object', function() {
    const k1 = new Kareem();
    const test1 = function() {};
    k1.pre('cook', test1);
    k1.post('cook', function() {});

    const k2 = new Kareem();
    const test2 = function() {};
    k2.pre('cook', test2);
    const k3 = k2.merge(k1);
    assert.equal(k3._pres.get('cook').length, 2);
    assert.equal(k3._pres.get('cook')[0].fn, test2);
    assert.equal(k3._pres.get('cook')[1].fn, test1);
    assert.equal(k3._posts.get('cook').length, 1);
  });
});
