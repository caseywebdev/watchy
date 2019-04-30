const commander = require('commander');

module.exports = argv =>
  commander
    .version(require('../package').version)
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
    .parse(argv);
