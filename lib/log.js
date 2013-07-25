'use strict';

var _ = require('underscore');
require('colors').setTheme({info: 'grey', error: 'red', success: 'green'});
var growl = require('growl');

var Log = module.exports = function (options) { _.extend(this, options); };

_.extend(Log.prototype, {
  name: 'watchy',

  send: function (type, title, message) {
    var name = this.name;
    if (this.growl) growl(message, {title: title, name: name});
    message = ('[' + name + '] ' + title.bold + ' ' + message)[type];
    if (type === 'error') return console.error(message);
    if (this.verbose) console.log(message);
  }
}, _.reduce(['info', 'success', 'error'], function (obj, type) {
  obj[type] = function (title, message) { this.send(type, title, message); };
  return obj;
}, {}));
