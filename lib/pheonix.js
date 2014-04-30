'use strict';

var _ = require('underscore');
var child_process = require('child_process');
var herit = require('herit');

module.exports = herit({
  state: 'dead',

  constructor: function (command, options) {
    this.command = command;
    _.extend(this, options);
    this.spawn();
  },

  spawn: function () {
    if (!this.isDead()) {
      if (this.isAlive()) this.kill();
      return;
    }
    var child = this.child = child_process.exec(this.command);
    this.state = 'alive';
    this.log.info(this.command, 'Spawning...');
    child.on('error', _.bind(this.onError, this));
    child.on('close', _.bind(this.onClose, this));
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.stdin.end();
  },

  onError: function (er) {
    this.log.error(this.command, 'Spawn failed (' + er + ')');
  },

  onClose: function (code, signal) {
    if (signal) {
      var type = signal === 'SIGKILL' ? 'error' : 'info';
      this.log[type](this.command, 'Killed with ' + signal);
    }
    if (code === 0) this.log.success(this.command, 'Exited cleanly');
    if (code > 0) this.log.error(this.command, 'Exited with code ' + code);
    var isRessurrecting = this.isRessurrecting();
    var isDying = this.isDying();
    this.state = 'dead';
    if (isRessurrecting || (!isDying && this.keepAlive)) this.spawn();
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
    this.log.info(this.command, 'Sending SIGTERM...');
    this.child.kill();
  },

  lastResort: function () {
    var message = 'Failed to kill with SIGTERM after ' + this.wait + ' seconds';
    this.log.error(this.command, message);
    this.child.kill('SIGKILL');
  },

  isDead: function () { return this.state === 'dead'; },

  isAlive: function () { return this.state === 'alive'; },

  isRessurrecting: function () { return this.state === 'resurrecting'; },

  isDying: function () { return this.state === 'dying'; }
});
