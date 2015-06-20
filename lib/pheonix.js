'use strict';

var _ = require('underscore');
var spawn = require('child_process').spawn;
var herit = require('herit');

module.exports = herit({
  state: 'dead',

  constructor: function (command, args, options) {
    this.command = command;
    this.args = args;
    _.extend(this, options);
    if (this.initSpawn) this.spawn();
    if (this.restart !== '-') this.enableRestart();
  },

  spawn: function (event, path) {
    if (!this.isDead()) {
      if (this.isAlive()) this.kill();
      return;
    }

    this.log.info('Spawning...');
    var child = this.child = spawn(this.command, this.args, {
      env: _.extend({EVENT: event || '', FILE: path || ''}, process.env),
      stdio: ['ignore', 1, 2]
    });
    this.state = 'alive';
    child.on('error', _.bind(this.onError, this));
    child.on('close', _.bind(this.onClose, this));
  },

  onError: function (er) {
    this.log.error('Spawn failed (' + er + ')');
  },

  onClose: function (code, signal) {
    if (signal) {
      var type = signal === 'SIGKILL' ? 'error' : 'info';
      this.log[type]('Killed with ' + signal);
    }
    if (code === 0) this.log.success('Exited cleanly');
    if (code > 0) this.log.error('Exited with code ' + code);
    var isRessurrecting = this.isRessurrecting();
    var isDying = this.isDying();
    this.state = 'dead';
    if (isRessurrecting || (!isDying && this.keepAlive)) this.spawn();
  },

  enableRestart: function () {
    var self = this;
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    process.stdin.on('data', function (data) {
      if (data.toString().trim() === self.restart) self.spawn();
    });
  },

  kill: function (stayDead) {
    var isDead = this.isDead();
    var isAlive = this.isAlive();
    if (!isDead) this.state = stayDead ? 'dying' : 'resurrecting';
    if (!isAlive) return;
    if (this.wait != null) {
      var timeout = _.delay(_.bind(this.lastResort, this), this.wait * 1000);
      this.child.on('close', function () { clearTimeout(timeout); });
    }
    this.log.info('Sending SIGTERM...');
    this.child.kill();
  },

  lastResort: function () {
    this.log.error(
      'Failed to kill with SIGTERM after ' + this.wait + ' seconds'
    );
    this.child.kill('SIGKILL');
  },

  isDead: function () { return this.state === 'dead'; },

  isAlive: function () { return this.state === 'alive'; },

  isRessurrecting: function () { return this.state === 'resurrecting'; },

  isDying: function () { return this.state === 'dying'; }
});
