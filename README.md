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

  -h, --help                           output usage information
  -V, --version                        output the version number
  -w, --watch [paths]                  rerun the command when [paths] change
  -i, --ignore [regex] [default /\.]   ignore changes to paths matching [regex]
  -k, --keep-alive                     restart on exit, useful for servers
  -W, --wait [sec]                     time after SIGTERM to SIGKILL
  -s, --silent                         be quieter, only output errors
  -n, --no-color                       disable colored output
  -S, --no-init-spawn                  prevent spawn when the watcher is created
  -r, --restart [string] [default rs]  enter this command to manually restart the process. Set to - to disable.
  -p, --use-polling                    slower, but useful when watching over NFS
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
