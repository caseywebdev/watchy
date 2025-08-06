import { watch as fsWatch } from 'node:fs';
import { glob, stat } from 'node:fs/promises';
import { dirname, join, matchesGlob, relative, resolve } from 'node:path';

const { clearTimeout, setTimeout } = globalThis;

const scanDelay = 5000;

/** @param {string[]} patterns */
const getCommonDir = patterns => {
  let dir = '';
  for (const pattern of patterns) {
    let pDir = dirname(pattern);
    while (pDir.match(/[[{(*?]/)) pDir = dirname(pDir);
    dir ||= pDir;
    while (pDir !== dir) {
      if (dir.length > pDir.length) dir = dirname(dir);
      else pDir = dirname(pDir);
    }
  }
  return dir;
};

/**
 * @param {{
 *   debounce?: number;
 *   onChange: (paths: string[]) => void;
 *   patterns: string[];
 * }} options
 */
export const watch = ({ debounce = 0.1, onChange, patterns }) => {
  if (!patterns.length) return () => {};

  let isActive = true;

  /** @type {Map<string, number>} */
  const mtimes = new Map();

  /** @type {Set<string>} */
  const changedPaths = new Set();

  /** @type {NodeJS.Timeout} */
  let flushTimeout;

  /** @type {NodeJS.Timeout} */
  let scanTimeout;

  patterns = patterns.map(pattern => resolve(pattern));
  const dir = getCommonDir(patterns);

  /** @param {string} path */
  const didChange = async path => {
    const existing = mtimes.get(path);
    try {
      const stats = await stat(path);
      if (stats.isDirectory()) throw new Error();

      const mtime = stats.mtime.getTime();
      mtimes.set(path, mtime);
      return mtime !== existing;
    } catch {
      mtimes.delete(path);
      return !!existing;
    }
  };

  /** @param {string[] | Set<string>} paths */
  const flush = async paths => {
    clearTimeout(flushTimeout);

    for (const path of paths) changedPaths.add(path);

    flushTimeout = setTimeout(() => {
      if (!isActive) return;

      const sorted = [...changedPaths].map(path => relative('.', path)).sort();
      changedPaths.clear();
      onChange(sorted);
    }, debounce * 1000);
  };

  const createWatcher = () =>
    fsWatch(dir, { recursive: true }, async (_, filename) => {
      if (!filename) return;

      const path = join(dir, filename);
      for (const pattern of patterns) {
        if (matchesGlob(path, pattern)) {
          if (await didChange(path)) return flush([path]);
        }
      }
    });

  let watcher = createWatcher();

  (async () => {
    let isInitial = true;
    const scan = async () => {
      /** @type {Set<string>} */
      const changedPaths = new Set();
      const unseenPaths = new Set(mtimes.keys());
      for (const pattern of patterns) {
        const dirents = await Array.fromAsync(
          glob(pattern, { withFileTypes: true })
        );
        if (!isActive) return;

        for (const dirent of dirents) {
          if (dirent.isDirectory()) continue;

          const path = resolve(dirent.parentPath, dirent.name);
          unseenPaths.delete(path);
          if (await didChange(path)) changedPaths.add(path);
          if (!isActive) return;
        }
      }

      for (const path of unseenPaths) {
        if (await didChange(path)) changedPaths.add(path);
        if (!isActive) return;
      }

      if (changedPaths.size && !isInitial) {
        flush(changedPaths);
        watcher.close();
        watcher = createWatcher();
      }

      isInitial = false;
      scanTimeout = setTimeout(scan, scanDelay);
    };

    scan();
  })();

  return () => {
    isActive = false;
    clearTimeout(flushTimeout);
    clearTimeout(scanTimeout);
    watcher.close();
  };
};
