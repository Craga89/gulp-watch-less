# [gulp](http://gulpjs.com)-watch-less [![Build Status](https://travis-ci.org/Craga89/gulp-watch-less.svg?branch=master)](https://travis-ci.org/Craga89/gulp-watch-less)

> Lorem ipsum

## Install

```sh
$ npm install --save-dev gulp-watch-less
```


## Usage

```js
var gulp = require('gulp');
var gulpWatchLess = require('gulp-watch-less');

gulp.task('default', function () {
	return gulp.src('src/file.ext')
		.pipe(gulpWatchLess())
		.pipe(gulp.dest('dist'));
});
```


## API

### GulpWatchLess(options)

#### options

##### foo

Type: `boolean`  
Default: `false`

Lorem ipsum.


## License

MIT © [Craga89](https://github.com/Craga89)
