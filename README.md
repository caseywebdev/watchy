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
Usage: watchy [options] -- command arg1 arg2...

Options:
  --watch, -w       A path or comma-separated paths to watch.
  --ignore, -i      A regex of file paths to ignore.                                         [default: "/\\."]
  --keep-alive, -k  Restart the process if it exits. Useful for servers.                     [default: false]
  --wait, -W        Time (sec) to wait after sending SIGTERM to forcefully SIGKILL.
  --silent, -s      Silence watching info, errors will still output to stderr.               [default: false]
  --no-color, -n    Do not color output.                                                     [default: false]
  --version, -v     Display the version.
  --restart, -r     Type this command to manually restart the process. Set to - to disable.  [default: "rs"]
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

By default, `watchy` will send `SIGTERM` to the running process after a change and wait for it to exit gracefully. By sending the `--wait|-W n` option, you can tell `watchy` to forcefully `SIGKILL` the process after `n` seconds. In general, you should try to clean up connections in your processes like so:

```js
process.on('SIGTERM', function () {
  server.close();
  db.disconnect();
  redis.quit();
  // etc...
});
```
