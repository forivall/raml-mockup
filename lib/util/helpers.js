var cloneDeep = require('lodash.clonedeep');

function _loop(obj, cb) {
  if (Array.isArray(obj)) {
    return obj.map(cb);
  }

  var out = {};

  if (!obj) {
    return out;
  }

  Object.keys(obj).forEach(function (key) {
    out[key] = cb(obj[key], key);
  });

  return out;
}

module.exports = {
  each: function (obj, cb) { _loop(obj, cb); },
  map: function (obj, cb) { return _loop(obj, cb); },
  omit: function (obj) {
    var keys = Array.prototype.slice.call(arguments, 1);
    var out = {};

    _loop(obj, function (value, key) {
      if (keys.indexOf(key) === -1) {
        out[key] = value;
      }
    });

    return out;
  },
  values: function (obj) {
    return _loop(obj, function (value) {
      return value;
    });
  },
  sample: function (obj) {
    return obj[Math.floor(Math.random() * obj.length)];
  },
  find: function (obj, cb) {
    for (var i = 0; i < obj.length; i++) {
      var value = obj[i];
      if (cb(value, i, obj)) return value;
    }
  },
  clone: cloneDeep
};
