const _ = require('underscore');
const {watchPath} = require('@atom/watcher');
const minimatch = require('minimatch');
const npath = require('npath');

const GLOB_RE = /[?*+@!]/;

const getDir = pattern => {
  const {index} = GLOB_RE.exec(pattern) || {index: pattern.length};
  const dir = npath.dirname(pattern.slice(0, index + 1));
  return dir === '/' ? dir : `${dir}/`;
};

const cleanDirs = dirs => {
  const sorted = _.sortBy(_.unique(dirs));
  const cleaned = [];
  for (let dir of sorted) {
    if (!dir.startsWith(_.last(cleaned))) cleaned.push(dir);
  }

  return cleaned;
};

module.exports = async ({
  onChange = _.noop,
  onError = _.noop,
  patterns = [],
  usePolling
}) => {
  patterns = patterns.map(pattern => npath.resolve(pattern));
  const dirs = cleanDirs(patterns.map(getDir));

  const handler = changes => {
    changes.forEach(({action, kind, path}) => {
      if (kind !== 'file') return;

      for (let pattern of patterns) {
        if (minimatch(path, pattern)) return onChange({action, path});
      }
    });
  };

  const getWatcher = _.partial(watchPath, _, {poll: usePolling}, handler);

  const watchers = await Promise.all(dirs.map(getWatcher));

  const onDidErrors = _.invoke(watchers, 'onDidError', onError);

  return () => {
    _.invoke(onDidErrors, 'dispose');
    _.invoke(watchers, 'dispose');
    _.invoke(_.compact(_.invoke(watchers, 'getNativeWatcher')), 'stop', false);
  };
};
