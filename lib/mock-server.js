var jsonfaker = require('json-schema-faker'),
    raml_parser = require('raml-1-parser'),
    refaker = require('refaker');

var path = require('path'),
    chalk = require('chalk'),
    express = require('express'),
    cors = require('cors');

var _ = require('./util/helpers');
var extract = require('./util/extract');

function createApp(options) {
  var refs = options.refs;
  var log = options.log;
  var api = options.api;

  var app = express();

  log('Resources:\n');

  _.each(api.resources, function(resource, path) {
    var route = path.replace(/\{(\w+)\}/g, ':$1');

    log('  ', chalk.green(route), '\n');

    _.each(resource, function(responses, method) {
      var keys = options.statuses || Object.keys(responses);

      log('    ' + chalk.cyan(method.toUpperCase()) + ' -> ' + (keys.join(', ')) + '\n');

      app.route(route)[method](function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Content-Length');
        res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Encoding, Content-Length, Content-Range');

        var reqStatus = req.query._statusCode || _.sample(keys),
            reqExample = req.query._forceExample === 'true' || options.forceExample;

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
            sample = schema ? jsonfaker(schema, refs) : sample;
          }

          res.statusCode = reqStatus;
          res.json(sample);
        } catch (e) {
          res.statusCode = 500;
          res.json({ error: e.message });
        }

        log('  ', chalk.yellow(req.url), '\n');
        log('    ', chalk.cyan(req.method), ' -> ', res.statusCode, '\n');
      });
    });
  });

  log('\n');

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
