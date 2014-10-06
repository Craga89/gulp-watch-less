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


## API

### GulpWatchLess(options)

#### options

All valid options to [gulp-watch](https://github.com/floatdrop/gulp-watch) are valid here, and are simply
passed through

##### less

Type: `object`  
Default: `{}`

*Optional* options passed through to the [less](https://github.com/less/less.js).Parser instance.


## License

MIT &copy; [Craig Michael Thompson](https://github.com/Craga89)
