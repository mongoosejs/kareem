var assert = require('assert');
var Kareem = require('../');

describe('pre hooks', function() {
  var hooks;

  beforeEach(function() {
    hooks = new Kareem();
  });

  it('runs without any hooks specified', function(done) {
    hooks.execPre('cook', null, function() {
      done();
    });
  });

  it('runs basic serial pre hooks', function(done) {
    var count = 0;

    hooks.pre('cook', function(done) {
      ++count;
      done();
    });

    hooks.execPre('cook', null, function() {
      assert.equal(1, count);
      done();
    });
  });

  it('can run multipe pres', function(done) {
    var count1 = 0;
    var count2 = 0;

    hooks.pre('cook', function(done) {
      ++count1;
      done();
    });

    hooks.pre('cook', function(done) {
      ++count2;
      done();
    });

    hooks.execPre('cook', null, function() {
      assert.equal(1, count1);
      assert.equal(1, count2);
      done();
    });
  });

  it('properly attaches context to pre hooks', function(done) {
    hooks.pre('cook', function(done) {
      this.bacon = 3;
      done();
    });

    hooks.pre('cook', function(done) {
      this.eggs = 4;
      done();
    });

    var obj = { bacon: 0, eggs: 0 }

    hooks.execPre('cook', obj, function() {
      assert.equal(3, obj.bacon);
      assert.equal(4, obj.eggs);
      done();
    });
  });
});