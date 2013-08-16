'use strict';

var _ = require('underscore');
var child_process = require('child_process');

// STATES
// 0 - dead
// 1 - running
// 2 - dying, will restart when dead
// 3 - dying, will not restart when dead

var Pheonix = module.exports = function (command, args, options) {
  this.command = command;
  this.args = args;
  this.title = _.flatten([command, args]).join(' ');
  _.extend(this, options);
  this.spawn();
};

_.extend(Pheonix.prototype, {
  spawn: function () {
    if (this.state > 0) {
      if (this.state > 1) return;
      return this.kill();
    }
    this.child = child_process.spawn(this.command, this.args);
    this.state = 1;
    this.log.info(this.title, 'Spawning...');
    this.child.on('error', _.bind(this.onError, this));
    this.child.on('close', _.bind(this.onClose, this));
    this.child.stdout.pipe(process.stdout);
    this.child.stderr.pipe(process.stderr);
    this.child.stdin.end();
  },

  onError: function (er) {
    this.log.error(this.title, 'Spawn failed (' + er + ')');
  },

  onClose: function (code, signal) {
    if (signal) {
      var type = signal === 'SIGKILL' ? 'error' : 'info';
      this.log[type](this.title, 'Killed with ' + signal);
    }
    if (code === 0) this.log.success(this.title, 'Exited cleanly');
    if (code > 0) this.log.error(this.title, 'Exited with code ' + code);
    var state = this.state;
    this.state = 0;
    if (state === 2 || (state !== 3 && this.keepAlive)) this.spawn();
  },

  kill: function (stayDead) {
    var state = this.state;
    if (state) this.state = stayDead ? 3 : 2;
    if (state !== 1) return;
    var timeout = _.delay(_.bind(this.lastResort, this), this.wait * 1000);
    this.child.on('close', function () { clearTimeout(timeout); });
    this.log.info(this.title, 'Sending SIGTERM...');
    this.child.kill();
  },

  lastResort: function () {
    var message = 'Failed to kill with SIGTERM after ' + this.wait + ' seconds';
    this.log.error(this.title, message);
    this.child.kill('SIGKILL');
  }
});
