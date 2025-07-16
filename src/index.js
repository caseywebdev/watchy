import { watch as fsWatch } from 'node:fs';
import { glob, stat } from 'node:fs/promises';
import { dirname, join, matchesGlob, relative, resolve } from 'node:path';

const { clearTimeout, setTimeout } = globalThis;

/** @param {{ onChange: (path: string) => void; patterns: string[] }} options */
export const watch = ({ onChange, patterns }) => {
  if (!patterns.length) return () => {};

  /** @type {Map<string, number>} */
  const mtimes = new Map();

  let isActive = true;

  /** @type {NodeJS.Timeout} */
  let recreateWatcherTimeout;

  /** @type {NodeJS.Timeout} */
  let reconcileTimeout;

  patterns = patterns.map(pattern => resolve(pattern));

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

  /**
   * @param {string} path
   * @param {boolean} [isFromReconciler]
   * @param {boolean} [isInitial]
   */
  const checkPath = async (
    path,
    isFromReconciler = false,
    isInitial = false
  ) => {
    const existing = mtimes.get(path);
    try {
      const stats = await stat(path);
      if (stats.isDirectory()) throw new Error();

      const mtime = stats.mtime.getTime();
      mtimes.set(path, mtime);
      if ((isInitial && !existing) || mtime === existing) return;
    } catch {
      if (!existing) return;

      mtimes.delete(path);
    }

    onChange(relative('.', path));
    if (isFromReconciler) recreateWatcher();
  };

  const createWatcher = () =>
    fsWatch(dir, { recursive: true }, async (_, filename) => {
      if (!filename) return;

      const path = join(dir, filename);
      for (const pattern of patterns) {
        if (matchesGlob(path, pattern)) return await checkPath(path);
      }
    });

  let watcher = createWatcher();

  const recreateWatcher = () => {
    clearTimeout(recreateWatcherTimeout);
    recreateWatcherTimeout = setTimeout(() => {
      watcher.close();
      watcher = createWatcher();
    }, 1000);
  };

  const nextTurn = async () => {
    const { resolve, promise } = Promise.withResolvers();
    reconcileTimeout = setTimeout(resolve);
    return promise;
  };

  (async () => {
    let isInitial = true;
    while (isActive) {
      const unseenPaths = new Set(mtimes.keys());
      for (const pattern of patterns) {
        const dirents = await Array.fromAsync(
          glob(pattern, { withFileTypes: true })
        );

        for (const dirent of dirents) {
          if (dirent.isDirectory()) continue;

          const path = resolve(dirent.parentPath, dirent.name);
          unseenPaths.delete(path);
          await checkPath(path, true, isInitial);
          if (!isInitial) await nextTurn();
          if (!isActive) return;
        }
      }
      isInitial = false;

      for (const path of unseenPaths) {
        await checkPath(path, true);
        await nextTurn();
        if (!isActive) return;
      }
    }
  })();

  return () => {
    isActive = false;
    clearTimeout(recreateWatcherTimeout);
    clearTimeout(reconcileTimeout);
    watcher.close();
  };
};
