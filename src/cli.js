#!/usr/bin/env node

const { spawn } = require('child_process');

const chalk = require('chalk');
const { program } = require('commander');
const _ = require('underscore');

const { version } = require('../package.json');

const watchy = require('.');

const { env } = process;

const getRunLabel = args =>
  args.map(arg => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(' ');

program
  .version(version)
  .usage('[options] -- command arg1 arg2 ...')
  .description('Run commands when paths change.')
  .option(
    '-d, --debounce [seconds]',
    'trigger a change at most every [seconds] seconds',
    parseFloat
  )
  .option('-k, --keep-alive', 'restart the process if it exits')
  .option('-n, --no-color', 'disable colored output')
  .option(
    '-p, --use-polling',
    'use file polling even if fsevents or inotify is available'
  )
  .option(
    '-r, --restart [string]',
    'send [string] to STDIN to restart the process'
  )
  .option(
    '-R, --no-restart-after-signal',
    'disable process restart after being signaled and exited'
  )
  .option('-s, --silent', 'only output errors')
  .option('-S, --no-init-spawn', 'prevent spawn when the watcher is created')
  .option(
    '-t, --shutdown-signal [signal]',
    'use [signal] to shut down the process',
    'SIGTERM'
  )
  .option(
    '-T, --reload-signal [signal]',
    'use [signal] to reload the process (defaults to shutdown signal)'
  )
  .option(
    '-w, --watch [pattern]',
    'watch [pattern] for changes, can be specified multiple times',
    (path, paths = []) => [].concat(paths, path)
  )
  .option(
    '-W, --wait [seconds]',
    "send SIGKILL to the process after [seconds] if it hasn't exited",
    parseFloat
  )
  .parse(process.argv);

const [command, ...args] = program.args;

let {
  color: useColor,
  debounce,
  initSpawn,
  keepAlive,
  restart,
  restartAfterSignal,
  reloadSignal,
  shutdownSignal,
  silent: onlyErrors,
  upgradeSignal,
  usePolling,
  wait,
  watch
} = program.opts();

const { green, red } = new chalk.Instance({
  level: useColor ? 1 : 0
});

const colors = { error: red, success: green };

const log = (type, message) => {
  if (onlyErrors && type !== 'error') return;

  message = (colors[type] || _.identity)(`[${type}] ${message}`);
  console[type === 'error' ? 'error' : 'log'](message);
};

if (!command) {
  console.error(program.helpInformation());
  log('error', 'Please specify a command.');
  process.exit(1);
}

const runLabel = getRunLabel([command, ...args]);
let child;
let sigkillTimeoutId;
let state = 'dead';
let closeWatcher;

const handleError = er => log('error', er.message);

const handleClose = (code, signal) => {
  child = null;
  if (signal) {
    log(signal === shutdownSignal ? 'info' : 'error', `Killed with ${signal}`);
  }
  if (code === 0) log('success', 'Exited cleanly');
  if (code > 0) log('error', `Exited with code ${code}`);
  const rerun = (state !== 'unsignaled' && restartAfterSignal) || keepAlive;
  state = 'dead';
  if (rerun) run();
};

const run = ({ action, path } = {}) => {
  if (state !== 'dead') {
    if (state === 'unsignaled' || upgradeSignal) kill();
    return;
  }

  log('info', runLabel);
  state = 'unsignaled';
  child = spawn(command, args, {
    env: { WATCHY_ACTION: action || '', WATCHY_PATH: path || '', ...env },
    stdio: ['ignore', 1, 2]
  })
    .on('error', handleError)
    .on('close', handleClose);
};

const kill = terminate => {
  if (state === 'dead' || state === 'terminating') return;

  if (!terminate) terminate = !reloadSignal;

  if (terminate && state === 'unsignaled' && wait) {
    sigkillTimeoutId = setTimeout(sigkill, wait * 1000);
    child.once('close', () => clearTimeout(sigkillTimeoutId));
  }

  const signal = terminate ? shutdownSignal : reloadSignal;
  log('info', `Sending ${signal}...`);
  state = terminate ? 'terminating' : 'reloading';
  child.kill(signal);
};

const sigkill = () => {
  log('error', `Failed to kill with ${shutdownSignal} after ${wait} seconds`);
  child.kill('SIGKILL');
};

const shutdown = () => {
  process.stdin.pause();
  if (closeWatcher) closeWatcher();
  keepAlive = false;
  restartAfterSignal = false;
  kill(true);
  if (child) child.once('close', () => process.exit());
  else process.exit();
};

if (watch) {
  watchy({
    onChange: debounce ? _.debounce(run, debounce * 1000) : run,
    onError: handleError,
    patterns: watch,
    usePolling
  })
    .then(_closeWatcher => (closeWatcher = _closeWatcher))
    .catch(er => handleError(er));
}

if (restart) {
  process.stdin.setEncoding('utf8');
  process.stdin.resume();
  process.stdin.on('data', data => {
    if (data.toString().trim() === restart) run();
  });
}

if (initSpawn) run();

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
