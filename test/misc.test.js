'use strict';

const assert = require('assert');
const Kareem = require('../');

describe('hasHooks', function() {
  it('returns false for toString (Automattic/mongoose#6538)', function() {
    const k = new Kareem();
    assert.ok(!k.hasHooks('toString'));
  });
});
