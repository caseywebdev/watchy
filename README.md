Watchy
===

A companion executable for [Chokidar](https://github.com/paulmillr/chokidar) that lets you run a command when a file in the given path(s) changes.

Install
-------

```bash
npm install -g watchy
```

Use
----

```
Usage: watchy [-w paths,to,watch] -- command arg1 arg2...

Options:
  --watch, -w       A path or comma-separated paths to watch.
  --ignore, -i      A regex of file paths to ignore.                                 [default: "/\\."]
  --keep-alive, -k  Restart the process if it exits. Useful for servers.             [default: false]
  --wait, -W        Time (sec) to wait after sending SIGTERM to forcefully SIGKILL.  [default: 0]
```

```bash
watchy -w lib -- say "The lib directory changed."
```
