# Changelog

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
