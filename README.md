# [gulp](http://gulpjs.com)-watch-less [![Build Status](https://travis-ci.org/Craga89/gulp-watch-less.svg?branch=master)](https://travis-ci.org/Craga89/gulp-watch-less)

> Watch .less files and their @imports using the [gulp-watch](https://github.com/floatdrop/gulp-watch) endless stream task

## Install

```sh
$ npm install --save-dev gulp-watch-less
```


## Usage

```js
var gulp = require('gulp');
var watchLess = require('gulp-watch-less');
var less = require('gulp-less');

gulp.task('default', function () {
	return gulp.src('less/file.less')
		.pipe(watchLess('less/file.less'))
		.pipe(less())
		.pipe(gulp.dest('dist'));
});
```

> __Protip:__ until gulpjs 4.0 is released, you can use [gulp-plumber](https://github.com/floatdrop/gulp-plumber) to prevent stops on errors.


## API

### GulpWatchLess(glob, [options, callback])

Creates watcher that will spy on files that were matched by glob which can be a [`node-glob`](https://github.com/isaacs/node-glob) string or array of strings.

**This will also watch all traced `@import` dependencies of the matched files, and re-emit a change event when any of them change**.
In this case, the `file.event` will be equal to `import:changed` for easy distinction.

Returns pass-through stream, that will emit vinyl files (with additional `event` property) that corresponds to event on file-system.

#### Callback `function(events, done)`

See documentation on [gulp-watch](https://github.com/floatdrop/gulp-watch) task

#### options

See documentation on [gulp-watch](https://github.com/floatdrop/gulp-watch) task

##### options.less

Type: `object`  
Default: `{}`

*Optional* options passed through to the [less](https://github.com/less/less.js).Parser instance.

## License

MIT &copy; [Craig Michael Thompson](https://github.com/Craga89)
