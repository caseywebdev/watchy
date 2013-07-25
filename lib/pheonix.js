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
      return this.kill(2);
    }
    this.child = child_process.spawn(this.command, this.args);
    this.state = 1;
    this.log.info(this.title, 'Spawning...');
    this.child.on('close', _.bind(this.onClose, this));
    this.child.stdout.pipe(process.stdout);
    this.child.stderr.pipe(process.stderr);
    this.child.stdin.end();
  },

  onClose: function (code, signal) {
    if (signal) {
      var type = signal === 'SIGKILL' ? 'error' : 'info';
      this.log[type](this.title, 'Killed with ' + signal);
    }
    if (code === 0) this.log.success(this.title, 'Exited cleanly');
    if (code) this.log.error(this.title, 'Exited with code ' + code);
    var state = this.state;
    this.state = 0;
    if (state === 2 || this['keep-alive']) this.spawn();
  },

  kill: function (state) {
    if (this.state > 1) return;
    this.state = state;
    var timeout = _.delay(_.bind(this.lastResort, this), this.wait * 1000);
    this.child.on('close', function () { clearTimeout(timeout); });
    this.child.kill();
  },

  lastResort: function () {
    var message = 'Failed to kill with SIGTERM after ' + this.wait + ' seconds';
    this.log.error(this.title, message);
    this.child.kill('SIGKILL');
  },

  killDead: function () {
    this['keep-alive'] = false;
    this.kill(3);
  }
});
