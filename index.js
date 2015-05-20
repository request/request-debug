var clone = require('stringify-clone');

var debugId = 0

module.exports = exports = function(request, log) {
  log = log || exports.log

  var proto
  if (request.Request) {
    proto = request.Request.prototype
  } else if (request.get && request.post) {
    // The object returned by request.defaults() doesn't include the
    // Request property, so do this horrible thing to get at it.  Per
    // Wikipedia, port 4 is unassigned.
    var req = request('http://localhost:4').on('error', function() { })
    proto = req.constructor.prototype
  } else {
    throw new Error(
      "Pass the object returned by require('request') to this function.")
  }

  if (!proto._initBeforeDebug) {
    proto._initBeforeDebug = proto.init

    proto.init = function() {
      if (!this._debugId) {

        this.on('request', function(req) {
          var data = {
            debugId : this._debugId,
            uri     : this.uri.href,
            method  : this.method,
            headers : clone(this.headers)
          }
          if (this.body) {
            data.body = this.body.toString('utf8')
          }
          log('request', data, this)

        }).on('response', function(res) {
          if (this.callback) {
            // callback specified, request will buffer the body for
            // us, so wait until the complete event to do anything
          } else {
            // cannot get body since no callback specified
            log('response', {
              debugId    : this._debugId,
              headers    : clone(res.headers),
              statusCode : res.statusCode
            }, this)
          }

        }).on('complete', function(res, body) {
          if (this.callback) {
            log('response', {
              debugId    : this._debugId,
              headers    : clone(res.headers),
              statusCode : res.statusCode,
              body       : res.body
            }, this)
          }

        }).on('redirect', function() {
          var type = (this.response.statusCode == 401 ? 'auth' : 'redirect')
          log(type, {
            debugId    : this._debugId,
            statusCode : this.response.statusCode,
            headers    : clone(this.response.headers),
            uri        : this.uri.href
          }, this)
        })

        this._debugId = ++debugId
      }

      return proto._initBeforeDebug.apply(this, arguments)
    }
  }

  if (!request.stopDebugging) {
    request.stopDebugging = function() {
      proto.init = proto._initBeforeDebug
      delete proto._initBeforeDebug
    }
  }
}

exports.log = function(type, data, r) {
  var toLog = {}
  toLog[type] = data
  console.error(toLog)
}
