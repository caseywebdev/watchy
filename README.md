# Watchy

Run commands when paths change.

## Install

You'll need to install [Node.js](http://nodejs.org) to use Watchy. Node comes
packaged with [npm](https://www.npmjs.org), which is Node's package manager, and
the preferred method of installing Watchy. After installing Node, simply type

```bash
npm install -g watchy
```

and you should have the `watchy` command available!

## Usage

```
Usage: watchy [options] -- command arg1 arg2 ...

Run commands when paths change.


Options:

  -V, --version                   output the version number
  -d, --debounce [seconds]        trigger a change at most every [seconds] seconds
  -i, --ignore [regex]            ignore changes to paths matching [regex] (default: /\.)
  -k, --keep-alive                restart the process if it exits
  -n, --no-color                  disable colored output
  -p, --use-polling               use file polling even if fsevents or inotify is available
  -r, --restart [string]          send [string] to STDIN to restart the process
  -R, --no-restart-after-signal   disable process restart after being signaled and exited
  -s, --silent                    only output errors
  -S, --no-init-spawn             prevent spawn when the watcher is created
  -t, --shutdown-signal [signal]  use [signal] to shut down the process (default: SIGTERM)
  -T, --reload-signal [signal]    use [signal] to reload the process (defaults to shutdown signal)
  -w, --watch [dir/file/glob]     watch [dir/file/glob] for changes, can be specified multiple times
  -W, --wait [seconds]            send SIGKILL to the process after [seconds] if it has't exited
  -h, --help                      output usage information
```

## Examples

```bash
# The simple case
watchy -w lib -- say "The lib directory changed."

# Piping works as well
watchy -w styles -- bash -c "lessc styles/main.less | autoprefixer -o .tmp/styles/main.css"

# Keep a process alive, restarting it as soon as it exits or "server.js"
# changes.
watchy -kw server.js -- node server.js

# Watch every file except dotfiles, the node_modules folder, and JSON files.
# NOTE: Listen to as few files as possible for better performance.
watchy -w . -i '/\.|/node_modules|\.json$' -- node server.js

# Tick tock!
watchy -ks -- bash -c 'date && sleep 1'

# Tick tock (annoying version)!
watchy -ks -- bash -c 'say "In case you were wondering, it is `date`" && sleep 5'

# $EVENT and $FILE are passed to the process from chokidar (thanks @remy).
watchy -w . -- bash -c 'echo $EVENT $FILE'
# => change /Users/casey/projects/watchy/README.md
```

> Note: If you're using `watchy` for help with preprocessing, I'd recommend
> checking out my [cogs](https://github.com/caseywebdev/cogs) project that is
> highly optimized for that case with in-memory processed file caching,
> directives, AMD support, and much more.

## SIGTERM

By default, `watchy` will send `SIGTERM` to the running process after a change
and wait for it to exit gracefully. By sending the `--wait|-W n` option, you can
tell `watchy` to forcefully `SIGKILL` the process after `n` seconds. In general,
you should try to clean up connections in your processes like so:

```js
process.on('SIGTERM', function () {
  server.close();
  db.disconnect();
  redis.quit();
  // etc...
});
```
