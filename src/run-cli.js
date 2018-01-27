const _ = require('underscore');
const {spawn} = require('child_process');
const chokidar = require('chokidar');
const getLog = require('./get-log');
const npath = require('npath');
const parseArgv = require('./parse-argv');

const {env} = process;

const getRunLabel = args =>
  args.map(arg => /\s/.test(arg) ? JSON.stringify(arg) : arg).join(' ');

module.exports = () => {
  const argv = parseArgv(process.argv);
  let {
    args: [command, ...args],
    color: useColor,
    debounce,
    ignore,
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
  } = argv;

  const log = getLog({onlyErrors, useColor});

  if (!command) {
    console.error(argv.helpInformation());
    log('error', 'Please specify a command.');
    process.exit(1);
  }

  const runLabel = getRunLabel([command, ...args]);
  let child;
  let sigkillTimeoutId;
  let state = 'dead';
  let watcher;

  const handleError = er => log('error', er.message);

  const handleClose = (code, signal) => {
    if (signal) {
      log(signal === shutdownSignal ? 'info' : 'error', `Killed with ${signal}`);
    }
    if (code === 0) log('success', 'Exited cleanly');
    if (code > 0) log('error', `Exited with code ${code}`);
    const rerun = (state !== 'unsignaled' && restartAfterSignal) || keepAlive;
    state = 'dead';
    if (rerun) run();
  };

  const run = (event, path) => {
    if (state !== 'dead') {
      if (state === 'unsignaled' || upgradeSignal) kill();
      return;
    }

    log('info', runLabel);
    state = 'unsignaled';
    child = spawn(command, args, {
      env: {WATCHY_EVENT: event || '', WATCHY_FILE: path || '', ...env},
      stdio: ['ignore', 1, 2]
    }).on('error', handleError).on('close', handleClose);
  };

  const kill = terminate => {
    if (state === 'dead' || state === 'terminating') return;

    if (!terminate) terminate = !reloadSignal;

    if (terminate && state === 'unsignaled' && wait) {
      sigkillTimeoutId = setTimeout(sigkill, wait * 1000);
      child.on('close', () => clearTimeout(sigkillTimeoutId));
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
    if (watcher) watcher.close();
    keepAlive = false;
    restartAfterSignal = false;
    kill(true);
  };

  if (watch) {
    watcher = chokidar.watch(
      watch.map(path => npath.resolve(path)),
      {ignored: new RegExp(ignore), ignoreInitial: true, usePolling}
    ).on('all', debounce ? _.debounce(run, debounce * 1000) : run);
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
};
