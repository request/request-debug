'use strict';

/**
 * Module dependencies.
 */

const clone = require('clone');

/**
 * Default log function.
 */

function log(type, data, r) {
  var toLog = {}
  toLog[type] = data
  console.error(toLog)
}


/**
 * Class `RequestDebug`.
 */

class RequestDebug {

  /**
   * Static `defaults` helper.
   */

  static defaults(request, options) {
    return new RequestDebug(request, options);
  }

  /**
   * Default constructor.
   */

  constructor(request, options) {
    if (!options) {
      options = {}
    }

    // Check for any object from `require('request')` or from `require('request').defaults({...})`.
    if (!(request && request.defaults && (request.Request || (request.get && request.post)))) {
      throw new Error('Invalid request module object');
    }

    this.debugging = true;
    this.id = 1;
    this.options = clone(options);
    this.logger(this.log = options.logger || log);
    this.client = request.defaults(options);

    // Wrap common `request` methods.
    ['delete', 'get', 'head', 'patch', 'post', 'put'].forEach(method => {
      this[method] = (data, options, callback) => {
        return this.fn(method, data, options, callback);
      }
    });
  }

  /**
   * `defaults` helper.
   */

  defaults(options) {
    if (!this.client.defaults || typeof this.client.defaults !== 'function') {
      throw new Error('Request does not support recursive method `defaults`');
    }

    const instance = new RequestDebug(this.client, Object.assign({}, this.options, options));

    // Pass the internal state to instance.
    instance.debugging = this.debugging;
    instance.log = this.log;

    return instance;
  }

  /**
   * Wrapper.
   */

  fn(method, data, options, callback) {
    let request;

    if (method) {
      request = this.client[method.toLowerCase()](data, options, callback);
    } else {
      request = this.client(data, options, callback);
    }


    if (!this.debugging) {
      return request;
    }

    const id = this.id++;
    const self = this;

    return request.on('error', function(error) {
      const data = {
        debugId: id,
        error,
        headers: clone(this.headers),
        method: this.method.toUpperCase(),
        uri: this.uri.href,
      }

      self.log('error', data, this);
    }).on('request', function(request) {
      const data = {
        debugId: id,
        headers: clone(this.headers),
        method: this.method.toUpperCase(),
        uri: this.uri.href
      };

      if (this.body) {
        data.body = this.body.toString('utf8');
      }

      self.log('request', data, this);
    }).on('response', function(response) {
      if (this.callback) {
        // Callback specified so `request` will buffer the body for
        // us. Wait for the `complete` event to do anything.
        return;
      }

      // Cannot get body since no callback has been specified.
      self.log('response', {
        debugId: id,
        headers: clone(response.headers),
        method: this.method,
        statusCode: response.statusCode
      }, this);
    }).on('redirect', function() {
      const type = (this.response.statusCode == 401 ? 'auth' : 'redirect');

      self.log(type, {
        debugId: id,
        headers: clone(this.response.headers),
        statusCode: this.response.statusCode,
        uri: this.uri.href
      }, this);
    }).on('complete', function(response, body) {
      if (!this.callback) {
        return;
      }

      self.log('response', {
        body: clone(response.body, false),
        debugId: id,
        headers: clone(response.headers),
        method: this.method,
        statusCode: response.statusCode
      }, this);
    });
  }

  /**
   * Logger function.
   */

  logger(fn) {
    if (typeof(fn) !== 'function') {
      throw new Error('Logger must be a function');
    }

    this.log = fn;
  }

  /**
   * Workaround for not specifying the method.
   */

  request(options, callback) {
    return this.fn(null, options, callback);
  }

  /**
   * Start debugging.
   */

  startDebugging() {
    this.debugging = true;
  }

  /**
   * Stop debugging.
   */

  stopDebugging() {
    this.debugging = false;
  }
}

/**
 * Export `RequestDebug`.
 */

module.exports = RequestDebug;
