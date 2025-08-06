#!/usr/bin/env node

/** @import {ChildProcess} from 'node:child_process' */

import { spawn } from 'node:child_process';
import fs from 'node:fs';

import chalk from 'chalk';
import { program } from 'commander';

import { watch } from './index.js';

const { console, process, URL } = globalThis;

const packagePath = new URL('../package.json', import.meta.url);
const { version } = JSON.parse(fs.readFileSync(packagePath).toString());

const { env } = process;

/** @param {string[]} args */
const getRunLabel = args =>
  args.map(arg => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(' ');

program
  .name('watchy')
  .version(version)
  .usage('[options] -- <command> [args...]')
  .description('Run commands when paths change.')
  .option(
    '-d, --debounce [seconds]',
    'trigger a change at most every [seconds] seconds',
    parseFloat
  )
  .option('-k, --keep-alive', 'restart the process if it exits')
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
    (path, paths = []) => [...paths, path]
  )
  .option(
    '-W, --wait [seconds]',
    "send SIGKILL to the process after [seconds] if it hasn't exited",
    parseFloat
  )
  .arguments('<command> [args...]')
  .parse(process.argv);

const [command, ...args] = program.args;

let {
  debounce,
  initSpawn,
  keepAlive,
  reloadSignal,
  restart,
  restartAfterSignal,
  shutdownSignal,
  silent: onlyErrors,
  upgradeSignal,
  wait,
  watch: patterns
} = program.opts();

const { green, red } = chalk;
const colors = {
  error: red,
  /** @param {string} str */
  info: str => str,
  success: green
};

/**
 * @param {'error' | 'info' | 'success'} type
 * @param {string} message
 */
const log = (type, message) => {
  if (onlyErrors && type !== 'error') return;

  message = colors[type](`[${type}] ${message}`);
  console[type === 'error' ? 'error' : 'log'](message);
};

const { clearTimeout, setTimeout } = globalThis;

if (!command) {
  console.error(program.helpInformation());
  log('error', 'Please specify a command.');
  process.exit(1);
}

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
    if (state === 'unsignaled' || upgradeSignal) kill();
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
  child?.kill(signal);
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
