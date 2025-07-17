import { watch as fsWatch } from 'node:fs';
import { glob, stat } from 'node:fs/promises';
import { dirname, join, matchesGlob, relative, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';

/** @param {{ onChange: (paths: string[]) => void; patterns: string[] }} options */
export const watch = ({ onChange, patterns }) => {
  if (!patterns.length) return () => {};

  let isActive = true;

  /** @type {Map<string, number>} */
  const mtimes = new Map();

  /** @type {Set<string>} */
  const changedPaths = new Set();

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

  const flushChanges = async () => {
    if (!changedPaths.size) return;

    const initialChangedPaths = new Set(changedPaths);
    await setTimeout(100);

    if (!isActive || changedPaths.difference(initialChangedPaths).size) return;

    onChange([...changedPaths].map(path => relative('.', path)).sort());
    changedPaths.clear();
  };

  const createWatcher = () =>
    fsWatch(dir, { recursive: true }, async (_, filename) => {
      if (!filename) return;

      const path = join(dir, filename);
      for (const pattern of patterns) {
        if (matchesGlob(path, pattern)) {
          if (await didChange(path)) {
            changedPaths.add(path);
            flushChanges();
          }
          return;
        }
      }
    });

  let watcher = createWatcher();

  (async () => {
    let isInitial = true;
    let needsNewWatcher = false;
    while (isActive) {
      const unseenPaths = new Set(mtimes.keys());
      for (const pattern of patterns) {
        const dirents = await Array.fromAsync(
          glob(pattern, { withFileTypes: true })
        );
        if (!isInitial) await setTimeout();
        if (!isActive) return;

        for (const dirent of dirents) {
          if (dirent.isDirectory()) continue;

          const path = resolve(dirent.parentPath, dirent.name);
          unseenPaths.delete(path);
          if ((await didChange(path)) && !isInitial) {
            changedPaths.add(path);
            needsNewWatcher = true;
          }
          if (!isInitial) await setTimeout();
          if (!isActive) return;
        }
      }
      isInitial = false;

      for (const path of unseenPaths) {
        if (await didChange(path)) {
          changedPaths.add(path);
          needsNewWatcher = true;
        }
        await setTimeout();
        if (!isActive) return;
      }

      if (needsNewWatcher) {
        flushChanges();
        needsNewWatcher = false;
        watcher.close();
        watcher = createWatcher();
      }
    }
  })();

  return () => {
    isActive = false;
    watcher.close();
  };
};
