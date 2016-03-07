var engine  = require('detect-engine'),
  lib     = require('./lib'),
  mocha   = require('mocha'),
  request = require('request'),
  should  = require('should')

describe('request-debug', function() {
  var proto = request.Request.prototype

  before(function() {
    lib.enableDebugging(request)
    lib.startServers()

    request = request.defaults({
      headers : {
        host : 'localhost'
      },
      rejectUnauthorized : false
    })
  })

  beforeEach(function() {
    lib.clearRequests()
  })

  function maybeTransferEncodingChunked(obj) {
    if (engine == 'node') {
      // Node sends 'Transfer-Encoding: chunked' here, io.js does not
      obj['transfer-encoding'] = 'chunked'
    }
    return obj
  }

  it('should capture a normal request', function(done) {
    request(lib.urls.http + '/bottom', function(err, res, body) {
      should.not.exist(err)
      lib.fixVariableHeaders()
      lib.requests.should.eql([
        {
          request : {
            debugId : lib.debugId,
            uri     : lib.urls.http + '/bottom',
            method  : 'GET',
            headers : {
              host : 'localhost'
            }
          }
        }, {
          response : {
            debugId : lib.debugId,
            headers : {
              connection       : '<close or keep-alive>',
              'content-length' : '10',
              'content-type'   : 'text/html; charset=utf-8',
              date             : '<date>',
              etag             : 'W/"<etag>"',
              'x-powered-by'   : 'Express'
            },
            statusCode : 200,
            body       : 'Request OK'
          }
        }
      ])
      done()
    })
  })

  it('should capture a request with no callback', function(done) {
    var r = request(lib.urls.http + '/bottom')
    r.on('complete', function(res) {
      lib.fixVariableHeaders()
      lib.requests.should.eql([
        {
          request : {
            debugId : lib.debugId,
            uri     : lib.urls.http + '/bottom',
            method  : 'GET',
            headers : {
              host : 'localhost'
            }
          }
        }, {
          response : {
            debugId : lib.debugId,
            headers : {
              connection       : '<close or keep-alive>',
              'content-length' : '10',
              'content-type'   : 'text/html; charset=utf-8',
              date             : '<date>',
              etag             : 'W/"<etag>"',
              'x-powered-by'   : 'Express'
            },
            statusCode : 200
          }
        }
      ])
      done()
    })
  })

  it('should capture a redirect', function(done) {
    request(lib.urls.http + '/middle', function(err, res, body) {
      should.not.exist(err)
      lib.fixVariableHeaders()
      // node 0.10 and 0.12 return content-length 41 for the redirect
      // iojs returns content-length 29
      // thus the catch block
      try {
        lib.requests.should.eql( [
          {
            request: {
              debugId: lib.debugId,
              uri: lib.urls.http + '/middle',
              method: 'GET',
              headers: {
                host: 'localhost'
              }
            }
          }, {
            redirect: {
              debugId: lib.debugId,
              headers: {
                connection: '<close or keep-alive>',
                'content-length': '41',
                'content-type': 'text/plain; charset=utf-8',
                date: '<date>',
                location: '/bottom',
                vary: 'Accept',
                'x-powered-by': 'Express',
              },
              statusCode: 302,
              uri: lib.urls.http + '/bottom'
            }
          }, {
            request: {
              debugId: lib.debugId,
              uri: lib.urls.http + '/bottom',
              method: 'GET',
              headers: {
                host: 'localhost:' + lib.ports.http
              }
            }
          }, {
            response: {
              debugId: lib.debugId,
              headers: {
                connection: '<close or keep-alive>',
                'content-length': '10',
                'content-type': 'text/html; charset=utf-8',
                date: '<date>',
                etag: 'W/"<etag>"',
                'x-powered-by': 'Express'
              },
              statusCode: 200,
              body: 'Request OK'
            }
          }
        ] )
      } catch( err ) {
        lib.requests.should.eql([
          {
            request : {
              debugId : lib.debugId,
              uri     : lib.urls.http + '/middle',
              method  : 'GET',
              headers : {
                host : 'localhost'
              }
            }
          }, {
            redirect : {
              debugId : lib.debugId,
              headers : {
                connection       : '<close or keep-alive>',
                'content-length' : '29',
                'content-type'   : 'text/plain; charset=utf-8',
                date             : '<date>',
                location         : '/bottom',
                vary             : 'Accept',
                'x-powered-by'   : 'Express',
              },
              statusCode : 302,
              uri        : lib.urls.http + '/bottom'
            }
          }, {
            request : {
              debugId : lib.debugId,
              uri     : lib.urls.http + '/bottom',
              method  : 'GET',
              headers : {
                host : 'localhost:' + lib.ports.http
              }
            }
          }, {
            response : {
              debugId : lib.debugId,
              headers : {
                connection       : '<close or keep-alive>',
                'content-length' : '10',
                'content-type'   : 'text/html; charset=utf-8',
                date             : '<date>',
                etag             : 'W/"<etag>"',
                'x-powered-by'   : 'Express'
              },
              statusCode : 200,
              body       : 'Request OK'
            }
          }
        ])
      }
      done()
    })
  })

  it('should capture a cross-protocol redirect', function(done) {
    request(lib.urls.https + '/middle/http', function(err, res, body) {
      should.not.exist(err)
      lib.fixVariableHeaders()
      try {
        lib.requests.should.eql( [
          {
            request: {
              debugId: lib.debugId,
              uri: lib.urls.https + '/middle/http',
              method: 'GET',
              headers: {
                host: 'localhost'
              }
            }
          }, {
            redirect: {
              debugId: lib.debugId,
              headers: {
                connection: '<close or keep-alive>',
                'content-length': '62',
                'content-type': 'text/plain; charset=utf-8',
                date: '<date>',
                location: lib.urls.http + '/bottom',
                vary: 'Accept',
                'x-powered-by': 'Express',
              },
              statusCode: 302,
              uri: lib.urls.http + '/bottom'
            }
          }, {
            request: {
              debugId: lib.debugId,
              uri: lib.urls.http + '/bottom',
              method: 'GET',
              headers: {
                host: 'localhost:' + lib.ports.http
              }
            }
          }, {
            response: {
              debugId: lib.debugId,
              headers: {
                connection: '<close or keep-alive>',
                'content-length': '10',
                'content-type': 'text/html; charset=utf-8',
                date: '<date>',
                etag: 'W/"<etag>"',
                'x-powered-by': 'Express'
              },
              statusCode: 200,
              body: 'Request OK'
            }
          }
        ] )
      } catch( err ) {
        lib.requests.should.eql([
          {
            request : {
              debugId : lib.debugId,
              uri     : lib.urls.https + '/middle/http',
              method  : 'GET',
              headers : {
                host : 'localhost'
              }
            }
          }, {
            redirect : {
              debugId : lib.debugId,
              headers : {
                connection       : '<close or keep-alive>',
                'content-length' : '50',
                'content-type'   : 'text/plain; charset=utf-8',
                date             : '<date>',
                location         : lib.urls.http + '/bottom',
                vary             : 'Accept',
                'x-powered-by'   : 'Express',
              },
              statusCode : 302,
              uri        : lib.urls.http + '/bottom'
            }
          }, {
            request : {
              debugId : lib.debugId,
              uri     : lib.urls.http + '/bottom',
              method  : 'GET',
              headers : {
                host : 'localhost:' + lib.ports.http
              }
            }
          }, {
            response : {
              debugId : lib.debugId,
              headers : {
                connection       : '<close or keep-alive>',
                'content-length' : '10',
                'content-type'   : 'text/html; charset=utf-8',
                date             : '<date>',
                etag             : 'W/"<etag>"',
                'x-powered-by'   : 'Express'
              },
              statusCode : 200,
              body       : 'Request OK'
            }
          }
        ])
      }
      done()
    })
  })

  it('should capture an auth challenge', function(done) {
    request(lib.urls.http + '/auth/bottom', {
      auth : {
        user : 'admin',
        pass : 'mypass',
        sendImmediately : false
      }
    }, function(err, res, body) {
      should.not.exist(err)
      lib.fixVariableHeaders()
      // node 4.23 auth comes back with content-length 12 and no chunked response
      // thus the catch block
      try {
        lib.requests.should.eql( [
          {
            request: {
              debugId: lib.debugId,
              uri: lib.urls.http + '/auth/bottom',
              method: 'GET',
              headers: {
                host: 'localhost'
              }
            }
          }, {
            auth: {
              debugId: lib.debugId,
              headers: maybeTransferEncodingChunked( {
                connection: '<close or keep-alive>',
                date: '<date>',
                'www-authenticate': 'Digest realm="Users" <+nonce,qop>',
                'x-powered-by': 'Express',
              } ),
              statusCode: 401,
              uri: lib.urls.http + '/auth/bottom'
            }
          }, {
            request: {
              debugId: lib.debugId,
              uri: lib.urls.http + '/auth/bottom',
              method: 'GET',
              headers: {
                authorization: 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                host: 'localhost'
              }
            }
          }, {
            response: {
              debugId: lib.debugId,
              headers: {
                connection: '<close or keep-alive>',
                'content-length': '10',
                'content-type': 'text/html; charset=utf-8',
                date: '<date>',
                etag: 'W/"<etag>"',
                'x-powered-by': 'Express'
              },
              statusCode: 200,
              body: 'Request OK'
            }
          }
        ] )
      } catch( err ) {
        lib.requests.should.eql([
          {
            request : {
              debugId : lib.debugId,
              uri     : lib.urls.http + '/auth/bottom',
              method  : 'GET',
              headers : {
                host : 'localhost'
              }
            }
          }, {
            auth : {
              debugId : lib.debugId,
              headers : {
                connection: '<close or keep-alive>',
                "content-length": "12",
                date: '<date>',
                'www-authenticate': 'Digest realm="Users" <+nonce,qop>',
                'x-powered-by': 'Express',
              },
              statusCode : 401,
              uri        : lib.urls.http + '/auth/bottom'
            }
          }, {
            request : {
              debugId : lib.debugId,
              uri     : lib.urls.http + '/auth/bottom',
              method  : 'GET',
              headers : {
                authorization : 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                host          : 'localhost'
              }
            }
          }, {
            response : {
              debugId : lib.debugId,
              headers : {
                connection       : '<close or keep-alive>',
                'content-length' : '10',
                'content-type'   : 'text/html; charset=utf-8',
                date             : '<date>',
                etag             : 'W/"<etag>"',
                'x-powered-by'   : 'Express'
              },
              statusCode : 200,
              body       : 'Request OK'
            }
          }
        ])
      }
      done()
    })
  })

  it('should capture a complicated redirect', function(done) {
    request(lib.urls.https + '/auth/top/http', {
      auth : {
        user : 'admin',
        pass : 'mypass',
        sendImmediately : false
      }
    }, function(err, res, body) {
      should.not.exist( err )
      lib.fixVariableHeaders()
      // iojs comes back with content-length 50 and 29 for the 2 redirect responses
      // thus the first catch block
      // node 4.2.3 auth response comes back with content-length 12 and no chunked response
      // thus the 2nd catch block
      try {
        lib.requests.should.eql( [
          {
            request: {
              debugId: lib.debugId,
              uri: lib.urls.https + '/auth/top/http',
              method: 'GET',
              headers: {
                host: 'localhost'
              }
            }
          }, {
            auth: {
              debugId: lib.debugId,
              headers: maybeTransferEncodingChunked( {
                connection: '<close or keep-alive>',
                date: '<date>',
                'www-authenticate': 'Digest realm="Users" <+nonce,qop>',
                'x-powered-by': 'Express',
              } ),
              statusCode: 401,
              uri: lib.urls.https + '/auth/top/http'
            }
          }, {
            request: {
              debugId: lib.debugId,
              uri: lib.urls.https + '/auth/top/http',
              method: 'GET',
              headers: {
                authorization: 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                host: 'localhost'
              }
            }
          }, {
            redirect: {
              debugId: lib.debugId,
              headers: {
                connection: '<close or keep-alive>',
                'content-length': '62',
                'content-type': 'text/plain; charset=utf-8',
                date: '<date>',
                location: lib.urls.http + '/middle',
                vary: 'Accept',
                'x-powered-by': 'Express',
              },
              statusCode: 302,
              uri: lib.urls.http + '/middle'
            }
          }, {
            request: {
              debugId: lib.debugId,
              uri: lib.urls.http + '/middle',
              method: 'GET',
              headers: {
                authorization: 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                host: 'localhost:' + lib.ports.http
              }
            }
          }, {
            redirect: {
              debugId: lib.debugId,
              headers: {
                connection: '<close or keep-alive>',
                'content-length': '41',
                'content-type': 'text/plain; charset=utf-8',
                date: '<date>',
                location: '/bottom',
                vary: 'Accept',
                'x-powered-by': 'Express',
              },
              statusCode: 302,
              uri: lib.urls.http + '/bottom'
            }
          }, {
            request: {
              debugId: lib.debugId,
              uri: lib.urls.http + '/bottom',
              method: 'GET',
              headers: {
                authorization: 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                host: 'localhost:' + lib.ports.http
              }
            }
          }, {
            response: {
              debugId: lib.debugId,
              headers: {
                connection: '<close or keep-alive>',
                'content-length': '10',
                'content-type': 'text/html; charset=utf-8',
                date: '<date>',
                etag: 'W/"<etag>"',
                'x-powered-by': 'Express'
              },
              statusCode: 200,
              body: 'Request OK'
            }
          }
        ] )
      } catch( err ) {
        try {
          lib.requests.should.eql( [
            {
              request: {
                debugId: lib.debugId,
                uri: lib.urls.https + '/auth/top/http',
                method: 'GET',
                headers: {
                  host: 'localhost'
                }
              }
            }, {
              auth: {
                debugId: lib.debugId,
                headers: maybeTransferEncodingChunked( {
                  connection: '<close or keep-alive>',
                  date: '<date>',
                  'www-authenticate': 'Digest realm="Users" <+nonce,qop>',
                  'x-powered-by': 'Express',
                } ),
                statusCode: 401,
                uri: lib.urls.https + '/auth/top/http'
              }
            }, {
              request: {
                debugId: lib.debugId,
                uri: lib.urls.https + '/auth/top/http',
                method: 'GET',
                headers: {
                  authorization: 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                  host: 'localhost'
                }
              }
            }, {
              redirect: {
                debugId: lib.debugId,
                headers: {
                  connection: '<close or keep-alive>',
                  'content-length': '50',
                  'content-type': 'text/plain; charset=utf-8',
                  date: '<date>',
                  location: lib.urls.http + '/middle',
                  vary: 'Accept',
                  'x-powered-by': 'Express',
                },
                statusCode: 302,
                uri: lib.urls.http + '/middle'
              }
            }, {
              request: {
                debugId: lib.debugId,
                uri: lib.urls.http + '/middle',
                method: 'GET',
                headers: {
                  authorization: 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                  host: 'localhost:' + lib.ports.http
                }
              }
            }, {
              redirect: {
                debugId: lib.debugId,
                headers: {
                  connection: '<close or keep-alive>',
                  'content-length': '29',
                  'content-type': 'text/plain; charset=utf-8',
                  date: '<date>',
                  location: '/bottom',
                  vary: 'Accept',
                  'x-powered-by': 'Express',
                },
                statusCode: 302,
                uri: lib.urls.http + '/bottom'
              }
            }, {
              request: {
                debugId: lib.debugId,
                uri: lib.urls.http + '/bottom',
                method: 'GET',
                headers: {
                  authorization: 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                  host: 'localhost:' + lib.ports.http
                }
              }
            }, {
              response: {
                debugId: lib.debugId,
                headers: {
                  connection: '<close or keep-alive>',
                  'content-length': '10',
                  'content-type': 'text/html; charset=utf-8',
                  date: '<date>',
                  etag: 'W/"<etag>"',
                  'x-powered-by': 'Express'
                },
                statusCode: 200,
                body: 'Request OK'
              }
            }
          ] )
        } catch ( err ) {
          lib.requests.should.eql( [
            {
              request: {
                debugId: lib.debugId,
                uri: lib.urls.https + '/auth/top/http',
                method: 'GET',
                headers: {
                  host: 'localhost'
                }
              }
            }, {
              auth: {
                debugId: lib.debugId,
                headers: {
                  connection: '<close or keep-alive>',
                  "content-length": "12",
                  date: '<date>',
                  'www-authenticate': 'Digest realm="Users" <+nonce,qop>',
                  'x-powered-by': 'Express',
                },
                statusCode: 401,
                uri: lib.urls.https + '/auth/top/http'
              }
            }, {
              request: {
                debugId: lib.debugId,
                uri: lib.urls.https + '/auth/top/http',
                method: 'GET',
                headers: {
                  authorization: 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                  host: 'localhost'
                }
              }
            }, {
              redirect: {
                debugId: lib.debugId,
                headers: {
                  connection: '<close or keep-alive>',
                  'content-length': '50',
                  'content-type': 'text/plain; charset=utf-8',
                  date: '<date>',
                  location: lib.urls.http + '/middle',
                  vary: 'Accept',
                  'x-powered-by': 'Express',
                },
                statusCode: 302,
                uri: lib.urls.http + '/middle'
              }
            }, {
              request: {
                debugId: lib.debugId,
                uri: lib.urls.http + '/middle',
                method: 'GET',
                headers: {
                  authorization: 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                  host: 'localhost:' + lib.ports.http
                }
              }
            }, {
              redirect: {
                debugId: lib.debugId,
                headers: {
                  connection: '<close or keep-alive>',
                  'content-length': '29',
                  'content-type': 'text/plain; charset=utf-8',
                  date: '<date>',
                  location: '/bottom',
                  vary: 'Accept',
                  'x-powered-by': 'Express',
                },
                statusCode: 302,
                uri: lib.urls.http + '/bottom'
              }
            }, {
              request: {
                debugId: lib.debugId,
                uri: lib.urls.http + '/bottom',
                method: 'GET',
                headers: {
                  authorization: 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                  host: 'localhost:' + lib.ports.http
                }
              }
            }, {
              response: {
                debugId: lib.debugId,
                headers: {
                  connection: '<close or keep-alive>',
                  'content-length': '10',
                  'content-type': 'text/html; charset=utf-8',
                  date: '<date>',
                  etag: 'W/"<etag>"',
                  'x-powered-by': 'Express'
                },
                statusCode: 200,
                body: 'Request OK'
              }
            }
          ] )
        }
      }
      done()
    })
  })

  it('should capture POST data and 404 responses', function(done) {
    request({
      uri    : lib.urls.http + '/bottom',
      method : 'POST',
      form   : {
        formKey : 'formData'
      }
    }, function(err, res, body) {
      should.not.exist(err)
      lib.fixVariableHeaders()
      lib.requests.should.eql([
        {
          request : {
            debugId : lib.debugId,
            uri     : lib.urls.http + '/bottom',
            method  : 'POST',
            headers : {
              host             : 'localhost',
              'content-length' : 16,
              'content-type'   : '<application/x-www-form-urlencoded>'
            },
            body : 'formKey=formData'
          }
        }, {
          response : {
            debugId : lib.debugId,
            headers : {
              connection       : '<close or keep-alive>',
              'content-length' : '20',
              'content-type'   : 'text/html; charset=utf-8',
              date             : '<date>',
              'x-powered-by'   : 'Express'
            },
            statusCode : 404,
            body       : 'Cannot POST /bottom\n'
          }
        }
      ])
      done()
    })
  })

  it('should capture JSON responses', function(done) {
    request({
      uri  : lib.urls.http + '/bottom',
      json : true
    }, function(err, res, body) {
      should.not.exist(err)
      lib.fixVariableHeaders()
      lib.requests.should.eql([
        {
          request : {
            debugId : lib.debugId,
            uri     : lib.urls.http + '/bottom',
            method  : 'GET',
            headers : {
              accept : 'application/json',
              host   : 'localhost'
            }
          }
        }, {
          response : {
            debugId : lib.debugId,
            headers : {
              connection       : '<close or keep-alive>',
              'content-length' : '15',
              'content-type'   : 'application/json; charset=utf-8',
              date             : '<date>',
              etag             : 'W/"<etag>"',
              'x-powered-by'   : 'Express'
            },
            statusCode : 200,
            body       : {
              key : 'value'
            }
          }
        }
      ])
      done()
    })
  })

  it('should work with the result of request.defaults()', function(done) {
    proto.should.have.property('_initBeforeDebug')
    proto.init = proto._initBeforeDebug
    delete proto._initBeforeDebug

    request = require('request').defaults({
      headers : {
        host : 'localhost'
      },
    })

    lib.enableDebugging(request)

    request(lib.urls.http + '/bottom', function(err, res, body) {
      should.not.exist(err)
      lib.fixVariableHeaders()
      lib.requests.should.eql([
        {
          request : {
            debugId : lib.debugId,
            uri     : lib.urls.http + '/bottom',
            method  : 'GET',
            headers : {
              host : 'localhost'
            }
          }
        }, {
          response : {
            debugId : lib.debugId,
            headers : {
              connection       : '<close or keep-alive>',
              'content-length' : '10',
              'content-type'   : 'text/html; charset=utf-8',
              date             : '<date>',
              etag             : 'W/"<etag>"',
              'x-powered-by'   : 'Express'
            },
            statusCode : 200,
            body       : 'Request OK'
          }
        }
      ])
      done()
    })
  })

  it('should not capture anything after stopDebugging()', function(done) {
    request.stopDebugging()
    request(lib.urls.http + '/bottom', function(err, res, body) {
      should.not.exist(err)
      lib.requests.should.eql([])
      done()
    })
  })
})
