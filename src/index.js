import { watch as fsWatch } from 'node:fs';
import { dirname, join, matchesGlob, relative, resolve } from 'node:path';

/** @param {{ onChange: (path: string) => void; patterns: string[] }} options */
export const watch = ({ onChange, patterns }) => {
  if (!patterns.length) return () => {};

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

  const watcher = fsWatch(dir, { recursive: true }, (_, filename) => {
    if (!filename) return;

    const path = join(dir, filename);
    for (const pattern of patterns) {
      if (matchesGlob(path, pattern)) return onChange(relative('.', path));
    }
  });

  return () => {
    watcher.close();
  };
};
