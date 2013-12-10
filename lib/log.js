'use strict';

var _ = require('underscore');
var chalk = require('chalk');
var herit = require('herit');

var colors = {
  info: chalk.grey,
  success: chalk.green,
  error: chalk.red
};

module.exports = herit(_.extend({
  name: 'watchy',

  constructor: function (options) { _.extend(this, options); },

  send: function (type, title, message) {
    if (this.silent && type !== 'error') return;
    message =
      colors[type]('[' + this.name + '] ' + chalk.bold(title) + ' ' + message);
    console[type === 'error' ? 'error' : 'log'](message);
  }
}, _.reduce(['info', 'success', 'error'], function (obj, type) {
  obj[type] = function (title, message) { this.send(type, title, message); };
  return obj;
}, {})));
