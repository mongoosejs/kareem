function Kareem() {
  this._pres = {};
  this._posts = {};
}

Kareem.prototype.execPre = function(name, context, arguments) {
  
};

Kareem.prototype.pre = function(name, isAsync, fn, error) {
  if ('boolean' !== typeof arguments[1]) {
    errorCallback = callback;
    callback = isAsync;
    isAsync = false;
  }

  this._pres[name] = this._pres[name] || [];
  var pres = this._pres[name];

  if (isAsync) {
    pres.numAsync = pres.numAsync || 0;
    ++pres.numAsync;
  }

  fn.isAsync = isAsync;
  this._pres.push(fn);

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
