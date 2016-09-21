
/**
 * Module dependencies.
 */

const sinon = require('sinon');

/**
 * Add `before` hook.
 */

before('sinon-hook', function () {
  this.sinon = sinon.sandbox.create();
});

/**
 * Add `afterEach` hook.
 */

afterEach('sinon-hook', function () {
  this.sinon.restore();
});
