#!/usr/bin/env node

/** @import {ChildProcess} from 'node:child_process' */

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { parseArgs, styleText } from 'node:util';

import { watch } from './index.js';

const { clearTimeout, console, process, setTimeout, URL } = globalThis;

const packagePath = new URL('../package.json', import.meta.url);
const { version } = JSON.parse((await readFile(packagePath)).toString());

const { env } = process;

/** @param {string[]} args */
const getRunLabel = args =>
  args.map(arg => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(' ');

const options = /** @type {const} */ ({
  debounce: {
    description: 'Trigger a change at most every [seconds] seconds',
    type: 'string',
    short: 'd'
  },
  help: { description: 'Show usage details', type: 'boolean', short: 'h' },
  'init-spawn': {
    description: 'Run the process on start',
    type: 'boolean',
    short: 'i',
    default: true
  },
  'keep-alive': {
    description: 'Restart the process if it exits',
    type: 'boolean',
    short: 'k',
    default: false
  },
  'reload-signal': {
    description:
      'Use [signal] to reload the process (defaults to shutdown signal)',
    type: 'string',
    short: 'T'
  },
  restart: {
    description: 'Send [string] to STDIN to restart the process',
    type: 'string',
    short: 'r'
  },
  'restart-after-signal': {
    description: 'Restart the process after being signaled and exited',
    type: 'boolean',
    default: true,
    short: 'R'
  },
  'shutdown-signal': {
    description: 'Use [signal] to shut down the process',
    type: 'string',
    short: 't',
    default: 'SIGTERM'
  },
  silent: { description: 'Only output errors', type: 'boolean', short: 's' },
  version: { description: 'Show version', type: 'boolean', short: 'v' },
  wait: {
    description:
      "Send SIGKILL to the process after [seconds] if it hasn't exited",
    type: 'string',
    short: 'W'
  },
  watch: {
    description: 'Watch [pattern] for changes, can be specified multiple times',
    type: 'string',
    short: 'w',
    default: /** @type {string[]} */ ([]),
    multiple: true
  }
});

/** @param {string} [errorMessage] */
const showHelp = errorMessage => {
  const maxKeyLength = Object.keys(options).reduce(
    (max, key) => Math.max(key.length, max),
    0
  );

  console[errorMessage ? 'error' : 'log'](
    `${errorMessage ? `${errorMessage}\n\n` : ''}Run commands when paths change

watchy [options] -- command arg1 arg2

${Object.entries(options)
  .map(
    ([key, { short, description }]) =>
      `--${key.padEnd(maxKeyLength)} -${short} ${description}`
  )
  .join('\n')}`
  );
  process.exit(errorMessage ? 1 : 0);
};

let positionals;
let values;

try {
  ({ positionals, values } = parseArgs({
    allowNegative: true,
    allowPositionals: true,
    options,
    strict: true
  }));
} catch (er) {
  throw showHelp(er instanceof Error ? er.message : 'Unknown Error');
}

const [command, ...args] = positionals;

if (values.help) throw showHelp();

if (values.version) {
  console.log(version);
  process.exit();
}

let {
  'init-spawn': initSpawn,
  'keep-alive': keepAlive,
  'shutdown-signal': shutdownSignal,
  'reload-signal': reloadSignal = shutdownSignal,
  'restart-after-signal': restartAfterSignal,
  debounce: _debounce,
  restart,
  silent: onlyErrors,
  wait: _wait,
  watch: patterns
} = values;

const debounce = _debounce ? parseFloat(_debounce) : undefined;
const wait = _wait ? parseFloat(_wait) : undefined;

/**
 * @param {'error' | 'info' | 'success'} type
 * @param {string} message
 */
const log = (type, message) => {
  if (onlyErrors && type !== 'error') return;

  message = styleText(
    type === 'error' ? 'red' : type === 'success' ? 'green' : [],
    `[${type}] ${message}`
  );
  console[type === 'error' ? 'error' : 'log'](message);
};

if (!command) throw showHelp('Please specify a command.');

const runLabel = getRunLabel([command, ...args]);
/** @type {ChildProcess | undefined} */
let child;
/** @type {NodeJS.Timeout | undefined} */
let sigkillTimeoutId;
let state = 'dead';
/** @type {ReturnType<typeof watch>} */
let closeWatcher;

/** @param {Error} er */
const handleError = er => log('error', er.message);

/**
 * @param {number} code
 * @param {NodeJS.Signals | undefined} signal
 */
const handleClose = (code, signal) => {
  child = undefined;
  if (signal) {
    log(signal === shutdownSignal ? 'info' : 'error', `Killed with ${signal}`);
  }
  if (code === 0) log('success', 'Exited cleanly');
  if (code > 0) log('error', `Exited with code ${code}`);
  const rerun = (state !== 'unsignaled' && restartAfterSignal) || keepAlive;
  state = 'dead';
  if (rerun) run();
};

/** @param {string[] | undefined} [paths] */
const run = (paths = []) => {
  if (state !== 'dead') {
    if (state === 'unsignaled') kill();
    return;
  }

  log('info', runLabel);
  state = 'unsignaled';
  child = spawn(command, args, {
    env: { WATCHY_PATHS: paths.join(','), ...env },
    stdio: ['ignore', 1, 2]
  })
    .on('error', handleError)
    .on('close', handleClose);
};

/** @param {boolean} [terminate] */
const kill = (terminate = false) => {
  if (state === 'dead' || state === 'terminating') return;

  if (!terminate) terminate = !reloadSignal;

  if (terminate && state === 'unsignaled' && wait) {
    sigkillTimeoutId = setTimeout(sigkill, wait * 1000);
    child?.once('close', () => clearTimeout(sigkillTimeoutId));
  }

  const signal = terminate ? shutdownSignal : reloadSignal;
  log('info', `Sending ${signal}...`);
  state = terminate ? 'terminating' : 'reloading';
  child?.kill(/** @type {NodeJS.Signals} */ (signal));
};

const sigkill = () => {
  log('error', `Failed to kill with ${shutdownSignal} after ${wait} seconds`);
  child?.kill('SIGKILL');
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

if (patterns) {
  try {
    closeWatcher = watch({ debounce, onChange: run, patterns });
  } catch (er) {
    handleError(/** @type {Error} */ (er));
    process.exit(1);
  }
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
