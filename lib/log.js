'use strict';

var _ = require('underscore');
require('colors').setTheme({info: 'grey', error: 'red', success: 'green'});

var Log = module.exports = function (options) { _.extend(this, options); };

_.extend(Log.prototype, {
  name: 'watchy',

  send: function (type, title, message) {
    message = ('[' + this.name + '] ' + title.bold + ' ' + message)[type];
    console[type === 'error' ? 'error' : 'log'](message);
  }
}, _.reduce(['info', 'success', 'error'], function (obj, type) {
  obj[type] = function (title, message) { this.send(type, title, message); };
  return obj;
}, {}));
