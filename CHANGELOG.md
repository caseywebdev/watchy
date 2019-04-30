# Changelog

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
