# request-debug [![Build status](https://img.shields.io/travis/request/request-debug.svg?style=flat)](https://travis-ci.org/request/request-debug) [![npm package](http://img.shields.io/npm/v/request-debug.svg?style=flat)](https://www.npmjs.org/package/request-debug)

This Node.js module provides an easy way to monitor HTTP(S) requests performed
by the [`request` module](https://github.com/request/request) (2.19.0+), and their
responses from external servers.

## Usage

Basic usage is to require the module and call it:

```js
const RequestDebug = require('request-debug');

const client = new RequestDebug();
```

This will set up event handlers on every request performed with the `client`
variable from this point.

The constructor `RequestDebug` supports all options of `request` (see options [here](https://github.com/request/request#requestoptions-callback)):
```js
const RequestDebug = require('request-debug');

const client = new RequestDebug({
  baseUrl: 'http://www.google.com',
  json: true
});
```

You can also specify a function to handle request or response data:

```js
const client = new RequestDebug ({
  logger: (type, data, r) => {
    // put your request or response handling logic here
  }
});
```
or by method `logger`:
```js
const client = new RequestDebug ();

request.logger((type, data, r) => {
  // put your request or response handling logic here
});
```

If you specify your own handling function, `r` will be the `Request` instance
that generated the event, and `type` will be one of the following values:

- **request** - Headers were sent to the server and will be included as
  `data.headers`.  `data.body` may also be present for POST requests.

- **response** - Headers were received from the server and will be included as
  `data.headers`.  Note that `request` only buffers the response body if a
  callback was given, so it will only be available as `data.body` if the
  initial call to `request` included a callback.

- **redirect** - A redirect status code (*HTTP 3xx*) was received.  The `data`
  object will have properties `statusCode`, `headers`, and `uri` (the address
  of the next request).

- **auth** - A *HTTP 401 Unathorized* response was received.  Internally,
  `request` handles this like a redirect, so the same properties will be
  available on the `data` object.

You can use the `data.debugId` parameter to match up requests with their
responses and other events.

The default handling function writes the data to *stderr* in Node's JSON-like
object display format.  See the example below for more details.

To disable debugging, call `request.stopDebugging()`.  Any requests that are in progress when
`stopDebugging()` is called will still generate debug events.

## Example

```js
const client = new RequestDebug();

client.request({
    uri  : 'https://raw.githubusercontent.com/request/request-debug/master/.gitignore',
}, function(err, res, body) {
    console.log('REQUEST RESULTS:', err, res.statusCode);
});
```

`request-debug` also supports calling `delete`, `get`, `head`, `patch`, `post` and `put` :

```js
const client = new RequestDebug();

client.get('https://github.com/request/request-debug');

client.post('https://github.com/request/request-debug');

client.head('https://github.com/request/request-debug');
```

Unless you provide your own logger function in options on the `request-debug` constructor call or set it via `logger` method, this will produce console output similar to thefollowing:

```js
{ request:
   { debugId: 1,
     headers: { host: 'raw.githubusercontent.com' },
     method: 'GET',
     uri: 'https://raw.githubusercontent.com/request/request-debug/master/.gitignore' } }
REQUEST RESULTS: null 200 node_modules

{ response:
   { body: 'node_modules\n',
     debugId: 1,
     headers:
      { 'content-security-policy': 'default-src \'none\'; style-src \'unsafe-inline\'',
        'strict-transport-security': 'max-age=31536000',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'deny',
        'x-xss-protection': '1; mode=block',
        etag: '"3c3629e647f5ddf82548912e337bea9826b434af"',
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'max-age=300',
        'x-geo-block-list': '',
        'x-github-request-id': 'B91F1215:5247:1A4348B:57E4F4E1',
        'content-length': '13',
        'accept-ranges': 'bytes',
        date: 'Fri, 23 Sep 2016 09:25:24 GMT',
        via: '1.1 varnish',
        connection: 'close',
        'x-served-by': 'cache-lcy1123-LCY',
        'x-cache': 'HIT',
        'x-cache-hits': '2',
        vary: 'Authorization,Accept-Encoding',
        'access-control-allow-origin': '*',
        'x-fastly-request-id': '6c0b96eef9098ba115b0f874a4ec48e9086b0669',
        expires: 'Fri, 23 Sep 2016 09:30:24 GMT',
        'source-age': '35' },
     method: 'GET',
     statusCode: 200 } }
```

## Compatibility

Tested with Node.js versions 4.0.x, 5.0.x, 6.0.x and 6.6.x on Travis, and a bunch
of different `request` versions (minimum 2.19.0).
