var jsonfaker = require('json-schema-faker'),
    raml_parser = require('raml-1-parser'),
    refaker = require('refaker');

var path = require('path'),
    util = require('util'),
    chalk = require('chalk'),
    express = require('express'),
    cors = require('cors');

var _ = require('./util/helpers');
var extract = require('./util/extract');

function createApp(options) {
  var hooks = options.hooks || {};
  var refs = options.refs;
  var api = options.api;

  var app = express();

  var buf = '';
  var log = function (s) {
    switch (arguments.length) {
      case 0: buf += '\n'; break;
      case 1: buf += s + '\n'; break;
      default: buf += util.format.apply(util, arguments) + '\n';
    }
  };
  log('Resources:');

  _.each(api.resources, function(resource, path) {
    var route = path.replace(/\{(\w+)\}/g, ':$1');

    log('\n' + chalk.green(route));

    _.each(resource, function(responses, method) {
      var keys = options.statuses || Object.keys(responses);

      var defaultKey = _.find(keys, function (key) {
        var n = Number(key);
        return 200 <= n && n < 400;
      }) || keys[0];

      log('  ' + chalk.cyan(method.toUpperCase()) + ' -> ' +
        keys.map(function (key) {
          return key === defaultKey ? chalk.bold(key) : key;
        }).join(', ')
      );

      var hookRoute = hooks[route];
      var hook = hookRoute == null ? null : hookRoute[method];

      app.route(route)[method](function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Content-Length');
        res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Encoding, Content-Length, Content-Range');

        var reqStatus = req.query._statusCode || req.headers['x-mock-status-code'];
        if (reqStatus === 'random') reqStatus = _.sample(keys);
        if (!reqStatus) reqStatus = defaultKey;

        var reqExample = (req.query._forceExample || req.headers['x-mock-force-example']) === 'true' || options.forceExample;

        try {
          if (keys.indexOf(reqStatus) === -1) {
            throw new Error('missing response for ' + req.url + ' (' + reqStatus + ')');
          }

          var sample = responses[reqStatus].example || null;
          var schema = api.definitions[responses[reqStatus]._ref] || null;

          if (!(sample || schema)) {
            throw new Error('missing example for ' + req.url + ' (' + reqStatus + ')');
          }

          if (!reqExample) {
            if (schema) {
              sample = jsonfaker(schema, refs);
            } else if (hook) {
              sample = _.clone(sample);
            }
          }

          res.statusCode = reqStatus;

          if (hook) sample = hook(sample, req, res);

          res.json(sample);
        } catch (e) {
          res.statusCode = 500;
          res.json({ error: e.message });
        }

        log('\n' +
          chalk.yellow(req.url), '\n' +
          '  ' + chalk.cyan(req.method), ' -> ' + res.statusCode
        );
      });
    });
  });

  log = options.log;
  log(buf);

  return app;
}

module.exports = function(params, callback) {
  if (!params.directory) {
    params.directory = path.dirname(params.raml);
  }

  if (!params.port) {
    params.port = process.env.PORT || 3000;
  }

  if (params.formats) {
    try {
      jsonfaker.format(require(path.resolve(params.formats)));
    } catch (e) {
      return callback(e);
    }
  }

  function log() {
    if (!params.silent && typeof params.log === 'function') {
      params.log(Array.prototype.slice.call(arguments).join(''));
    }
  }

  raml_parser.loadApi(params.raml).then(function(data) {
    var _errors = data.errors();

    if (_errors.length) {
      log('Errors/warnings found:\n');

      _errors.forEach(function(error) {
        log('  ', chalk.red('- ' + error.message), '\n');
      });
    }

    try {
      data = data.toJSON();
      var api = extract(data);

      params.schemas = [];

      _.each(data.schemas, function(obj) {
        _.each(obj, function(schema, ref) {
          api.definitions[ref] = JSON.parse(schema);
        });
      });

      _.each(api.definitions, function(schema, ref) {
        schema._ref = ref;
        params.schemas.push(schema);
      });

      refaker(params, function (err, refs, schemas) {
        if (err) {
          return callback(err);
        }

        _.each(schemas, function(schema) {
          api.definitions[schema._ref] = schema;
          delete schema._ref;
        });

        var base = 'http://localhost:' + params.port;
        log('Endpoint:\n', chalk.yellow(base), '\n');

        var app = express();

        app.use(cors());

        app.use(createApp({
          refs: refs,
          api: api,
          log: log,
          statuses: params.statuses ? params.statuses.split(',') : null,
          forceExample: params.forceExample
        }));

        app.use(function(req, res) {
          res.statusCode = 500;
          res.json({ error: 'Missing resource for ' + req.url });
        });

        app.listen(params.port, function() {
          callback(null, this.close.bind(this));
        });
      });
    } catch (e) {
      callback(e.message || e);
    }
  }, callback);
};

module.exports.createApp = createApp;
module.exports.extract = extract;
