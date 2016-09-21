'use strict';

/**
 * Module dependencies.
 */

require('./util/sinon-hook');
const RequestDebug = require('../.');
const mocha = require('mocha');
const request = require('request');
const should  = require('should');

/**
 * Fake API links.
 */

const APInok = 'http://random.foo.bar';
const APIok = 'http://jsonplaceholder.typicode.com';
const requestConfig = { timeout: 5000 };

/**
 * `RequestDebug` testing.
 */

describe('RequestDebug', () => {
  describe('static defaults()', () => {
    it('should return an instance of `RequestDebug`', function() {
      RequestDebug.defaults(request, {}).should.be.instanceOf(RequestDebug);
    });

    it('should set `options` in the returned instance', function() {
      [{ foo: 'bar' }, { foo: 'bar', logger: () => {} }].forEach(options => {
          RequestDebug.defaults(request, options).options.should.eql(options);
      });
    });

    it('should throw if `request` is invalid', function () {
      [null, {}, { Request: 'foo' }, { defaults: 'foo' }, { defaults: 'foo', get: 'bar' }].forEach(dummyRequest => {
        try {
          RequestDebug.defaults(dummyRequest, {});
        } catch (e) {
          e.message.should.equal('Invalid request module object');
        }
      });
    })
  });

  describe('constructor()', () => {
    it('should set a default logger', function() {
      (new RequestDebug(request)).log.should.not.be.null();
    });

    it('should enable debugging as default', function() {
      (new RequestDebug(request)).debugging.should.equal(true);
    });

    it('should initialize the request id with `1`', function() {
      (new RequestDebug(request)).id.should.equal(1);;
    });

    it('should set `options`', function() {
      (new RequestDebug(request, { foo: 'bar' })).options.should.eql({ foo: 'bar' });
    });

    it('should call `request.defaults()`', function() {
      this.sinon.spy(request, 'defaults');

      new RequestDebug(request);

      request.defaults.callCount.should.equal(1);
    });

    ['delete', 'get', 'head', 'patch', 'post', 'put'].forEach(method => {
      it(`should wrap \`request\` method \`${method}\``, function() {
        (new RequestDebug(request)).should.have.property(method);
      });
    });
  });

  describe('defaults()', () => {
    it('should return an instance with same state', function() {
      const logger = () => {};
      const requestDebug = new RequestDebug(request, { foo: 'bar', logger });

      requestDebug.stopDebugging();

      if (request.defaults({}).defaults) {
        const requestDebugCopy = requestDebug.defaults({ foo: 'biz', bar: 'baz' });

        should.exist(requestDebugCopy);
        requestDebugCopy.debugging.should.equal(false);
        requestDebugCopy.log.should.equal(logger);
        requestDebugCopy.options.should.eql({ foo: 'biz', logger, bar: 'baz' });
      } else {
        try {
          requestDebug.defaults({ foo: 'biz', bar: 'baz' });
        } catch (e) {
          e.message.should.equal('Request does not support recursive method `defaults`');
        }
      }
    });
  });

  describe('fn()', () => {
    it('should not capture anything if debugging is set to `false`', function(done) {
      this.timeout(requestConfig.timeout + 2000);

      const requestDebug = new RequestDebug(request, { logger: this.sinon.stub() });

      requestDebug.stopDebugging();

      requestDebug.get(APIok, requestConfig, function(err, res, body) {
        should.not.exist(err);
        should.exist(res);
        should.exist(body);

        requestDebug.log.callCount.should.equal(0);

        done();
      });
    });

    it('should not increment the debug id if debugging is set to `false`', function(done) {
      this.timeout(requestConfig.timeout + 2000);

      const requestDebug = new RequestDebug(request, { logger: () => {} });
      const initialId = requestDebug.id;

      requestDebug.stopDebugging();

      requestDebug.get(APIok, requestConfig, function(err, res, body) {
        should.not.exist(err);
        should.exist(res);
        should.exist(body);

        requestDebug.id.should.equal(initialId);

        done();
      });
    });

    it('should increment the debug id', function(done) {
      this.timeout(requestConfig.timeout + 2000);

      const requestDebug = new RequestDebug(request, { logger: () => {} });
      const initialId = requestDebug.id;

      requestDebug.get(APIok, requestConfig, function(err, res, body) {
        should.not.exist(err);
        should.exist(res);
        should.exist(body);

        requestDebug.id.should.equal(initialId + 1);

        done();
      });
    });

    it('should log an `error` event', function(done) {
      const requestDebug = new RequestDebug(request, { logger: this.sinon.stub() });

      requestDebug.get(APInok, requestConfig, function(err, res, body) {
        should.exist(err);
        should.not.exist(res);
        should.not.exist(body);
      }).on('error', () => {
        requestDebug.log.callCount.should.equal(2);

        done();
      });
    });

    it('should log a `request` event', function(done) {
      const requestDebug = new RequestDebug(request, { logger: this.sinon.stub() });

      requestDebug.get(APInok, requestConfig, function(err, res, body) {
        should.exist(err);
        should.not.exist(res);
        should.not.exist(body);
      }).on('request', () => {
        requestDebug.log.callCount.should.equal(1);

        done();
      });
    });

    it('should log a `response` event', function(done) {
      this.timeout(requestConfig.timeout + 2000);

      const requestDebug = new RequestDebug(request, { logger: this.sinon.stub() });

      requestDebug.get(APIok, requestConfig, function(err, res, body) {
        should.not.exist(err);
        should.exist(res);
        should.exist(body);
      }).on('response', () => {
        requestDebug.log.callCount.should.equal(1);

        done();
      });
    });

    it('should log a `complete` event', function(done) {
      this.timeout(requestConfig.timeout + 2000);

      const requestDebug = new RequestDebug(request, { logger: this.sinon.stub() });

      requestDebug.get(APIok, requestConfig, function(err, res, body) {
        should.not.exist(err);
        should.exist(res);
        should.exist(body);
      }).on('complete', function(response, body) {
        requestDebug.log.callCount.should.equal(2);
        requestDebug.log.firstCall.args[0].should.equal('request');
        requestDebug.log.secondCall.args[0].should.equal('response');
        requestDebug.log.secondCall.args[1].should.eql({
          body: response.body,
          debugId: requestDebug.id - 1,
          headers: response.headers,
          method: this.method,
          statusCode: response.statusCode
        });

        done();
      });
    });
  });

  describe('logger()', () => {
    it('should throw if logger is not a function', function() {
      try {
        new RequestDebug(request, { logger: 'foo' });

        should.fail();
      } catch (e) {
        e.message.should.equal('Logger must be a function')
      }
    });

    it('should set an instance logger', function() {
      (new RequestDebug(request)).log.should.be.type('function');
    });

    it('should set the logger on the instance', function() {
      (new RequestDebug(request, { logger: () => {} })).log.should.be.type('function');
    });
  });

  describe('request()', () => {
    it('should call with default method `GET`', function(done) {
      this.timeout(requestConfig.timeout + 2000);

      const requestDebug = new RequestDebug(request, { logger: this.sinon.stub() });

      requestDebug.request({ uri: APIok }, function(err, res, body) {
        should.not.exist(err);
        should.exist(res);
        should.exist(body);
      }).on('response', function() {
        this.method.should.equal('GET');

        requestDebug.log.callCount.should.equal(1);

        done();
      });
    });
  });

  describe('startDebugging()', () => {
    it('should capture after startDebugging()', function(done) {
      this.timeout(requestConfig.timeout + 2000);

      const requestDebug = new RequestDebug(request, { logger: this.sinon.stub() });

      requestDebug.stopDebugging();
      requestDebug.startDebugging();

      requestDebug.get(APIok, requestConfig, function(err, res, body) {
        should.not.exist(err);
        requestDebug.log.callCount.should.equal(1);

        done();
      });
    });
  });

  describe('stopDebugging()', () => {
    it('should not capture anything after stopDebugging()', function(done) {
      this.timeout(requestConfig.timeout + 2000);

      const requestDebug = new RequestDebug(request, { logger: this.sinon.stub() });

      requestDebug.stopDebugging();

      requestDebug.get(APIok, requestConfig, function(err, res, body) {
        should.not.exist(err);
        requestDebug.log.callCount.should.equal(0);

        done();
      });
    });
  });
});
