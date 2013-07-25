Watchy
===

A companion executable for [Watchr](https://github.com/bevry/watchr) that lets you run a command when a file in the given path(s) changes.

Install
-------

```bash
npm install watchy
```

Use
----

```
Usage: watchy [-w paths,to,watch] -- command arg1 arg2...

Options:
  --watch, -w             A path or comma-separated paths to watch.
  --ignore-paths, -i      A path or comma-separated paths to ignore.
  --ignore-basenames, -I  A basename regex to ignore (ie \.css$).
  --keep-alive, -k        Restart the process if it exits. Useful for servers.             [default: false]
  --wait, -W              Time (sec) to wait after sending SIGTERM to forcefully SIGKILL.  [default: 0]

[Error: Please specify a command.]
```

```bash
watchy -w lib -- say "The lib directory changed."
```
