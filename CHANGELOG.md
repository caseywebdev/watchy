# Changelog

# 0.12.0
- A file poller was added to pick up file changes that may have been missed by
  file system events. This adds a small CPU overhead but means changed files
  will all eventually be detected.
- **BREAKING**
  - A short debounce time was added to the `onChange` callback to prevent
    duplicate changes triggering in rapid succession.
  - The `onChange` callback now receives `paths` instead of a single `path`.
  - The `WATCHY_PATH` envvar has been renamed to `WATCHY_PATHS` and contains a
    comma-separated list of all paths changed

## 0.11.0
- Add TS definition file
- **BREAKING**
  - Default export converted to named `watch` export.
  - `chokidar` dependency dropped. Uses `fs.watch` now.
  - `usePolling` option dropped
  - `onError` callback removed. `watch` will fail synchronously if a watcher is not able to created on the base directory.
  - onChange callback changed from `(options: { action: string; path: string }) => void` to just `(path: string) => void`. Action was often incorrect/inconsistent.
  - The CLI remains the same except for the removal of `--use-polling`

## 0.10.0
- Upgrade to ES modules.
- Drop -n/--no-color flag, determine color based on TTY.
  Use FORCE_COLOR=0/1 envvar override color support.

## 0.9.7
- @atom/watcher is likely being discontinued, so switching to chokidar@3

## 0.9.6
- Fix typo in usage output.

## 0.9.1
- Fix package.json `main` entry.

## 0.9.0
- File watching is now handled by the `@atom/watcher` package.
- **BREAKING**
  Removed `i/--ignore` option.
- **BREAKING**
  `-w/--watch` arguments are now specified as extglob patterns.

## 0.7.1
- Add `-K/--kill-signal` option to override `SIGTERM` with a custom signal.
- Add `-m/--multiple` flag to allow the kill signal to be sent to the process
  multiple times.
- `-K` and `-m` make upgrading a process on change possible, for example

  ```bash
  watchy -w /etc/nginx/nginx.conf -mK SIGHUP -- nginx
  ```

  will upgrade nginx whenever the config file is changed.

## 0.7.0
- **BREAKING**
  The path passed to `-w/--watch` is no longer split on comma. This was a bit of
  a lazy way to handle multiple paths and inherently prevented the possibility
  of watching a path with a comma. From `0.7.0` on, specify multiple paths to
  watch by passing multiple `-w/--watch` flags.

  For example, instead of

  ```bash
  watchy -w bin,lib,CHANGELOG.md -- ls
  ```

  use

  ```bash
  watchy -w bin -w lib -w CHANGELOG.md -- ls
  ```

## 0.6.6
- Add a changelog.
- Add `--no-init-spawn` option to optionally *not* run the command on start, but
  only after changes.
