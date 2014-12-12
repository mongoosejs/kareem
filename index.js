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

  if (!numPres) {
    return process.nextTick(function() {
      callback();
    });
  }

  var next = function() {
    var pre = pres[currentPre];

    pre.fn.call(context, function(error) {
      if (error) {
        return callback(error);
      }
      if (++currentPre >= numPres) {
        return callback();
      }

      next();
    });
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

Kareem.prototype.post = function(name, isAsync, fn) {
  if (arguments.length === 2) {
    fn = isAsync;
    isAsync = false;
  }

  fn.isAsync = isAsync;
  (this._posts[name] = this._posts[name] || []).push(fn);
  return this;
};

module.exports = Kareem;
