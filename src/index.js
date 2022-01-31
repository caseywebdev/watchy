import chokidar from 'chokidar';
import _ from 'underscore';

const handle = (onChange, action) => path => onChange({ action, path });

export default ({
  onChange = _.noop,
  onError = _.noop,
  patterns = [],
  usePolling
}) =>
  new Promise(resolve => {
    const watcher = chokidar
      .watch(patterns, { ignoreInitial: true, usePolling })
      .on('error', onError)
      .on('ready', () => resolve(watcher.close.bind(watcher)))
      .on('add', handle(onChange, 'add'))
      .on('change', handle(onChange, 'change'))
      .on('unlink', handle(onChange, 'unlink'));
  });
