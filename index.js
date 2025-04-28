'use strict';

/**
 * Create a new instance
 */
function Kareem() {
  this._pres = new Map();
  this._posts = new Map();
}

Kareem.skipWrappedFunction = function skipWrappedFunction() {
  if (!(this instanceof Kareem.skipWrappedFunction)) {
    return new Kareem.skipWrappedFunction(...arguments);
  }

  this.args = [...arguments];
};

Kareem.overwriteResult = function overwriteResult() {
  if (!(this instanceof Kareem.overwriteResult)) {
    return new Kareem.overwriteResult(...arguments);
  }

  this.args = [...arguments];
};

/**
 * Execute all "pre" hooks for "name"
 * @param {String} name The hook name to execute
 * @param {*} context Overwrite the "this" for the hook
 * @param {Array|Function} args Optional arguments or directly the callback
 * @param {Function} [callback] The callback to call when executing all hooks are finished
 * @returns {void}
 */
Kareem.prototype.execPre = async function execPre(name, context, args) {
  const pres = this._pres.get(name) || [];
  const numPres = pres.length;
  const $args = args;
  let skipWrappedFunction = null;

  if (!numPres) {
    return;
  }

  const asyncPrePromises = [];
  for (const pre of pres) {
    if (pre.isAsync) {
      let nextResolve = null;
      let nextReject = null;
      const nextPromise = new Promise((resolve, reject) => {
        nextResolve = resolve;
        nextReject = reject;
      });
      let doneResolve = null;
      let doneReject = null;
      const donePromise = new Promise((resolve, reject) => {
        doneResolve = resolve;
        doneReject = reject;
      });
      const args = [(err) => err ? nextReject(err) : nextResolve(), (err) => err ? doneReject(err) : doneResolve()];
      const maybePromiseLike = pre.fn.apply(context, args);
      try {
        if (isPromiseLike(maybePromiseLike)) {
          await maybePromiseLike;
        } else {
          await nextPromise;
        }
      } catch (error) {
        if (error instanceof Kareem.skipWrappedFunction) {
          skipWrappedFunction = error;
          continue;
        }
        throw error;
      }
      asyncPrePromises.push(donePromise);
    } else if (pre.fn.length > 0) {
      let resolve = null;
      let reject = null;
      const cbPromise = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
      });
      const args = [(err) => err ? reject(err) : resolve()];
      const _args = [null].concat($args);
      for (let i = 1; i < _args.length; ++i) {
        if (i === _args.length - 1 && typeof _args[i] === 'function') {
          continue; // skip callbacks to avoid accidentally calling the callback from a hook
        }
        args.push(_args[i]);
      }

      try {
        const maybePromiseLike = pre.fn.apply(context, args);
        if (isPromiseLike(maybePromiseLike)) {
          await maybePromiseLike;
        } else {
          await cbPromise;
        }
      } catch (error) {
        if (error instanceof Kareem.skipWrappedFunction) {
          skipWrappedFunction = error;
          continue;
        }
        throw error;
      }
    } else {
      try {
        await pre.fn.call(context);
      } catch (error) {
        if (error instanceof Kareem.skipWrappedFunction) {
          skipWrappedFunction = error;
          continue;
        }
        throw error;
      }
    }
  }

  await Promise.all(asyncPrePromises);

  if (skipWrappedFunction) {
    throw skipWrappedFunction;
  }
};

/**
 * Execute all "pre" hooks for "name" synchronously
 * @param {String} name The hook name to execute
 * @param {*} context Overwrite the "this" for the hook
 * @param {Array} [args] Apply custom arguments to the hook
 * @returns {void}
 */
Kareem.prototype.execPreSync = function(name, context, args) {
  const pres = this._pres.get(name) || [];
  const numPres = pres.length;

  for (let i = 0; i < numPres; ++i) {
    pres[i].fn.apply(context, args || []);
  }
};

/**
 * Execute all "post" hooks for "name"
 * @param {String} name The hook name to execute
 * @param {*} context Overwrite the "this" for the hook
 * @param {Array|Function} args Apply custom arguments to the hook
 * @param {*} options Optional options or directly the callback
 * @returns {void}
 */
Kareem.prototype.execPost = async function execPost(name, context, args, options) {
  const posts = this._posts.get(name) || [];
  const numPosts = posts.length;

  let firstError = null;
  if (options && options.error) {
    firstError = options.error;
  }

  if (!numPosts) {
    if (firstError != null) {
      throw firstError;
    }
    return args;
  }

  for (const currentPost of posts) {
    const post = currentPost.fn;
    let numArgs = 0;
    const newArgs = [];
    const argLength = args.length;
    for (let i = 0; i < argLength; ++i) {
      if (!args[i] || !args[i]._kareemIgnore) {
        numArgs += 1;
        newArgs.push(args[i]);
      }
    }
    // If numCallbackParams set, fill in the rest with null to enforce consistent number of args
    if (options?.numCallbackParams != null) {
      numArgs = options.numCallbackParams;
      for (let i = newArgs.length; i < numArgs; ++i) {
        newArgs.push(null);
      }
    }

    let resolve;
    let reject;
    const cbPromise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    newArgs.push(function nextCallback(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });

    if (firstError) {
      if (isErrorHandlingMiddleware(currentPost, numArgs)) {
        try {
          const res = post.apply(context, [firstError].concat(newArgs));
          if (isPromiseLike(res)) {
            await res;
          } else if (post.length === numArgs + 2) {
            // `numArgs + 2` because we added the error and the callback
            await cbPromise;
          }
        } catch (error) {
          if (error instanceof Kareem.overwriteResult) {
            args = error.args;
            continue;
          }
          firstError = error;
        }
      } else {
        continue;
      }
    } else {
      if (isErrorHandlingMiddleware(currentPost, numArgs)) {
        // Skip error handlers if no error
        continue;
      } else {
        let res = null;
        try {
          res = post.apply(context, newArgs);
          if (isPromiseLike(res)) {
            res = await res;
          } else if (post.length === numArgs + 1) {
            // If post function takes a callback, wait for the post function to call the callback
            res = await cbPromise;
          }
        } catch (error) {
          if (error instanceof Kareem.overwriteResult) {
            args = error.args;
            continue;
          }
          firstError = error;
          continue;
        }

        if (res instanceof Kareem.overwriteResult) {
          args = res.args;
          continue;
        }
      }
    }
  }

  if (firstError != null) {
    throw firstError;
  }

  return args;
};

/**
 * Execute all "post" hooks for "name" synchronously
 * @param {String} name The hook name to execute
 * @param {*} context Overwrite the "this" for the hook
 * @param {Array|Function} args Apply custom arguments to the hook
 * @returns {Array} The used arguments
 */
Kareem.prototype.execPostSync = function(name, context, args) {
  const posts = this._posts.get(name) || [];
  const numPosts = posts.length;

  for (let i = 0; i < numPosts; ++i) {
    const res = posts[i].fn.apply(context, args || []);
    if (res instanceof Kareem.overwriteResult) {
      args = res.args;
    }
  }

  return args;
};

/**
 * Create a synchronous wrapper for "fn"
 * @param {String} name The name of the hook
 * @param {Function} fn The function to wrap
 * @returns {Function} The wrapped function
 */
Kareem.prototype.createWrapperSync = function(name, fn) {
  const _this = this;
  return function syncWrapper() {
    _this.execPreSync(name, this, arguments);

    const toReturn = fn.apply(this, arguments);

    const result = _this.execPostSync(name, this, [toReturn]);

    return result[0];
  };
};

/**
 * Executes pre hooks, followed by the wrapped function, followed by post hooks.
 * @param {String} name The name of the hook
 * @param {Function} fn The function for the hook
 * @param {*} context Overwrite the "this" for the hook
 * @param {Array} args Apply custom arguments to the hook
 * @param {Object} options Additional options for the hook
 * @returns {void}
 */
Kareem.prototype.wrap = async function wrap(name, fn, context, args, options) {
  let ret;
  let skipWrappedFunction = false;
  try {
    await this.execPre(name, context, args);
  } catch (error) {
    if (error instanceof Kareem.skipWrappedFunction) {
      ret = error.args;
      skipWrappedFunction = true;
    } else {
      await this.execPost(name, context, args, { ...options, error });
    }
  }

  if (!skipWrappedFunction) {
    ret = await fn.apply(context, args);
  }

  ret = await this.execPost(name, context, [ret], options);

  return ret[0];
};

/**
 * Filter current instance for something specific and return the filtered clone
 * @param {Function} fn The filter function
 * @returns {Kareem} The cloned and filtered instance
 */
Kareem.prototype.filter = function(fn) {
  const clone = this.clone();

  const pres = Array.from(clone._pres.keys());
  for (const name of pres) {
    const hooks = this._pres.get(name).
      map(h => Object.assign({}, h, { name: name })).
      filter(fn);

    if (hooks.length === 0) {
      clone._pres.delete(name);
      continue;
    }

    hooks.numAsync = hooks.filter(h => h.isAsync).length;

    clone._pres.set(name, hooks);
  }

  const posts = Array.from(clone._posts.keys());
  for (const name of posts) {
    const hooks = this._posts.get(name).
      map(h => Object.assign({}, h, { name: name })).
      filter(fn);

    if (hooks.length === 0) {
      clone._posts.delete(name);
      continue;
    }

    clone._posts.set(name, hooks);
  }

  return clone;
};

/**
 * Check for a "name" to exist either in pre or post hooks
 * @param {String} name The name of the hook
 * @returns {Boolean} "true" if found, "false" otherwise
 */
Kareem.prototype.hasHooks = function(name) {
  return this._pres.has(name) || this._posts.has(name);
};

/**
 * Create a Wrapper for "fn" on "name" and return the wrapped function
 * @param {String} name The name of the hook
 * @param {Function} fn The function to wrap
 * @param {*} context Overwrite the "this" for the hook
 * @param {Object} [options]
 * @returns {Function} The wrapped function
 */
Kareem.prototype.createWrapper = function(name, fn, context, options) {
  const _this = this;
  if (!this.hasHooks(name)) {
    // Fast path: if there's no hooks for this function, just return the function
    return fn;
  }
  return function kareemWrappedFunction() {
    const _context = context || this;
    return _this.wrap(name, fn, _context, Array.from(arguments), options);
  };
};

/**
 * Register a new hook for "pre"
 * @param {String} name The name of the hook
 * @param {Boolean} [isAsync]
 * @param {Function} fn The function to register for "name"
 * @param {never} error Unused
 * @param {Boolean} [unshift] Wheter to "push" or to "unshift" the new hook
 * @returns {Kareem}
 */
Kareem.prototype.pre = function(name, isAsync, fn, error, unshift) {
  let options = {};
  if (typeof isAsync === 'object' && isAsync !== null) {
    options = isAsync;
    isAsync = options.isAsync;
  } else if (typeof arguments[1] !== 'boolean') {
    fn = isAsync;
    isAsync = false;
  }

  const pres = this._pres.get(name) || [];
  this._pres.set(name, pres);

  if (isAsync) {
    pres.numAsync = pres.numAsync || 0;
    ++pres.numAsync;
  }

  if (typeof fn !== 'function') {
    throw new Error('pre() requires a function, got "' + typeof fn + '"');
  }

  if (unshift) {
    pres.unshift(Object.assign({}, options, { fn: fn, isAsync: isAsync }));
  } else {
    pres.push(Object.assign({}, options, { fn: fn, isAsync: isAsync }));
  }

  return this;
};

/**
 * Register a new hook for "post"
 * @param {String} name The name of the hook
 * @param {Object} [options]
 * @param {Boolean} [options.errorHandler] Whether this is an error handler
 * @param {Function} fn The function to register for "name"
 * @param {Boolean} [unshift] Wheter to "push" or to "unshift" the new hook
 * @returns {Kareem}
 */
Kareem.prototype.post = function(name, options, fn, unshift) {
  const posts = this._posts.get(name) || [];

  if (typeof options === 'function') {
    unshift = !!fn;
    fn = options;
    options = {};
  }

  if (typeof fn !== 'function') {
    throw new Error('post() requires a function, got "' + typeof fn + '"');
  }

  if (unshift) {
    posts.unshift(Object.assign({}, options, { fn: fn }));
  } else {
    posts.push(Object.assign({}, options, { fn: fn }));
  }
  this._posts.set(name, posts);
  return this;
};

/**
 * Register a new error handler for "name"
 * @param {String} name The name of the hook
 * @param {Object} [options]
 * @param {Function} fn The function to register for "name"
 * @param {Boolean} [unshift] Wheter to "push" or to "unshift" the new hook
 * @returns {Kareem}
 */

Kareem.prototype.postError = function postError(name, options, fn, unshift) {
  if (typeof options === 'function') {
    unshift = !!fn;
    fn = options;
    options = {};
  }
  return this.post(name, { ...options, errorHandler: true }, fn, unshift);
};

/**
 * Clone the current instance
 * @returns {Kareem} The cloned instance
 */
Kareem.prototype.clone = function() {
  const n = new Kareem();

  for (const key of this._pres.keys()) {
    const clone = this._pres.get(key).slice();
    clone.numAsync = this._pres.get(key).numAsync;
    n._pres.set(key, clone);
  }
  for (const key of this._posts.keys()) {
    n._posts.set(key, this._posts.get(key).slice());
  }

  return n;
};

/**
 * Merge "other" into self or "clone"
 * @param {Kareem} other The instance to merge with
 * @param {Kareem} [clone] The instance to merge onto (if not defined, using "this")
 * @returns {Kareem} The merged instance
 */
Kareem.prototype.merge = function(other, clone) {
  clone = arguments.length === 1 ? true : clone;
  const ret = clone ? this.clone() : this;

  for (const key of other._pres.keys()) {
    const sourcePres = ret._pres.get(key) || [];
    const deduplicated = other._pres.get(key).
      // Deduplicate based on `fn`
      filter(p => sourcePres.map(_p => _p.fn).indexOf(p.fn) === -1);
    const combined = sourcePres.concat(deduplicated);
    combined.numAsync = sourcePres.numAsync || 0;
    combined.numAsync += deduplicated.filter(p => p.isAsync).length;
    ret._pres.set(key, combined);
  }
  for (const key of other._posts.keys()) {
    const sourcePosts = ret._posts.get(key) || [];
    const deduplicated = other._posts.get(key).
      filter(p => sourcePosts.indexOf(p) === -1);
    ret._posts.set(key, sourcePosts.concat(deduplicated));
  }

  return ret;
};

function isPromiseLike(v) {
  return (typeof v === 'object' && v !== null && typeof v.then === 'function');
}

function isErrorHandlingMiddleware(post, numArgs) {
  if (post.errorHandler) {
    return true;
  }
  return post.fn.length === numArgs + 2;
}

module.exports = Kareem;
