'use strict';

var PLUGIN_NAME = 'gulp-watch-less';

var gulp = require('gulp'),
	gutil = require('gulp-util'),
	watch = require('gulp-watch'),
	mergeDefaults = require('lodash.defaults'),
	through = require('through2'),
	less = require('less');

// Helper that closes and returns a given stream
function closeStream(stream) {
	if(stream) {
		stream.end();
		stream.unpipe();
		stream.close && stream.close();
	}

	return stream;
}

// Generates list of @import paths for a given Vinyl file
function getLessFileImports(file, options, cb) {
	var imports = [];

	// Support (file, cb) signature
	if(typeof options === 'function') {
		cb = options; options = null;
	}

	// Create new parser instance, using file path as `filename` option
	var parser = new less.Parser(mergeDefaults({
		filename: file.path
	}, 
	options || {}));

	// Parse the source into AST tree via LESS and return `imports` array
	parser.parse(file.contents.toString('utf8'), function (err, tree) {
		// Add a better error message / properties
		if (err) { 
			err.lineNumber = err.line;
			err.fileName = err.filename;
			err.message = err.message + ' in file ' + err.fileName + ' line no. ' + err.lineNumber;
		} 

		// Generate imports list from the files hash (sorted)
		var imports = Object.keys(parser.imports.files).sort();

		cb(err, imports);
	});
};

var _imports = {}; // Tracks import lists i.e.  `{file.path}: [imports]`
var _streams = {}; // Tracks watch streams i.e. `{file.path}: stream`

// Name of the event fired when @imports cause file to change
// (Overwrites the current file.event set by gulp-watch/gaze)
var changeEvent = 'changed:via:import'; 


// Import generator
function watchLessImports(file, options, cb, done) {
	var filePath = file.path;

	function log() {
		var args = Array.prototype.slice.apply(arguments);
		gutil.log.apply(gutil, [gutil.colors.cyan(options.name)].concat(args));
	}

	// Generate an @import list via LESS...
	getLessFileImports(file, options.less, function(err, imports) {
		// Emit the error if one was returned
		if (err) { cb(new gutil.PluginError(PLUGIN_NAME, err)); }

		// Check to ensure the imports have actually changed before we re-watch!
		if(_imports[filePath] && _imports[filePath].join() === imports.join()) {
			options.verbose && log('saw no @import changes detected for ' + gutil.colors.magenta(file.relative));
			return;
		}

		// Overwrite previous imports with new list
		_imports[filePath] = imports;

		// If verbose logging is on, and if this is a subsequent gaze event (not initial setup)
		// output information about @import changes and @imports l
		if(options.verbose && file.event) {
			log(
				gutil.colors.cyan('detected @import additions/deletions, re-parsing...'),
				'\n\t'+gutil.colors.magenta('Watching'), 
				imports.join('\n\t\t'+gutil.colors.magenta('Watching '))
			);
		}

		// Get and close the previous import stream
		var importStream = closeStream(_streams[filePath]);

		// Create a new watch stream that will watch the @import file list
		// but only if we actually have some @imports to track
		if(imports.length) {
			_streams[filePath] = watch(imports, options, cb);
		}

		// Fire done callback
		done();
	});
}

module.exports = function (glob, options, callback) {
	// No-op callback if not given
	if(!options) { options = {}; }
	if(!callback) { callback = function() {}; }

	// Merge defaults
	options = mergeDefaults(options, {
		name: 'LESS', // Use LESS name by default
		less: {} // No LESS options by default
	});

	// Generate a basic `gulp-watch` stream
	var watchStream = watch(glob, options, callback)

	function watchImportStream(file, enc, cb) {
		var filePath = file.path;

		// Passthrough the file
		this.push(file); 

		// Make sure we only execute the logic on external events
		// and not when our own internal changeEvent triggers it
		if(file.event !== changeEvent) {
			watchLessImports(file, options, function(importFile) {
				watchStream.trigger(changeEvent, filePath);
			},
			cb);
		}

		// Otherwise exeute the callback logic immediately
		else { cb(); }

	}

	// Close all import watch streams when the watchStream ends
	watchStream.on('end', function() { Object.keys(_streams).forEach(closeStream); });

	// Immediately apply the globs and watch all imports, since otherwise we'd
	// have to edit the files once before any @import watching would activate
	gulp.src(glob).pipe(through.obj(watchImportStream));

	// Pipe the watch stream into the imports watcher so whenever any of the
	// files change, we re-generate our @import watcher so removals/additions 
	// are detected
	watchStream.pipe(through.obj(watchImportStream));

	return watchStream;
};
