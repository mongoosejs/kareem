'use strict';

function Kareem() {
  this._pres = {};
  this._posts = {};
}

Kareem.prototype.execPre = function(name, context, callback) {
  var pres = this._pres[name] || [];
  var numPres = pres.length;
  var numAsyncPres = pres.numAsync || 0;
  var currentPre = 0;
  var asyncPresLeft = numAsyncPres;
  var done = false;

  if (!numPres) {
    return process.nextTick(function() {
      callback();
    });
  }

  var next = function() {
    var pre = pres[currentPre];

    if (pre.isAsync) {
      pre.fn.call(
        context,
        function(error) {
          if (error) {
            if (done) {
              return;
            }
            done = true;
            return callback(error);
          }

          ++currentPre;
          next();
        },
        function(error) {
          if (error) {
            if (done) {
              return;
            }
            done = true;
            return callback(error);
          }

          if (0 === --numAsyncPres) {
            return callback();
          } 
        });
    } else if (pre.fn.length > 0) {
      pre.fn.call(context, function(error) {
        if (error) {
          if (done) {
            return;
          }
          done = true;
          return callback(error);
        }

        if (++currentPre >= numPres) {
          if (asyncPresLeft > 0) {
            // Leave parallel hooks to run
            return;
          } else {
            return callback();
          }
        }

        next();
      });
    } else {
      pre.fn.call(context);
      if (++currentPre >= numPres) {
        if (asyncPresLeft > 0) {
          // Leave parallel hooks to run
          return;
        } else {
          return process.nextTick(function() {
            callback()
          });
        }
      }
      next();
    }
  };

  next();
};

Kareem.prototype.execPost = function(name, context, args, callback) {
  var posts = this._posts[name] || [];
  var numPosts = posts.length;
  var currentPost = 0;
  var done = false;

  if (!numPosts) {
    return process.nextTick(function() {
      callback();
    });
  }

  var next = function() {
    var post = posts[currentPost];

    if (post.length > args.length) {
      post.apply(context, args.concat(function(error) {
        if (error) {
          if (done) {
            return;
          }
          return callback(error);
        }

        if (++currentPost >= numPosts) {
          return callback.apply(null, [undefined].concat(args));
        }

        next();
      }));
    } else {
      post.apply(context, args);

      if (++currentPost >= numPosts) {
        return callback.apply(null, [undefined].concat(args));
      }

      next();
    }
  };

  next();
};

Kareem.prototype.pre = function(name, isAsync, fn, error) {
  if ('boolean' !== typeof arguments[1]) {
    error = fn;
    fn = isAsync;
    isAsync = false;
  }

  this._pres[name] = this._pres[name] || [];
  var pres = this._pres[name];

  if (isAsync) {
    pres.numAsync = pres.numAsync || 0;
    ++pres.numAsync;
  }

  pres.push({ fn: fn, isAsync: isAsync });

  return this;
};

Kareem.prototype.post = function(name, fn) {
  (this._posts[name] = this._posts[name] || []).push(fn);
  return this;
};

module.exports = Kareem;
