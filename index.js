'use strict';

var PLUGIN_NAME = 'gulp-watch-less';

var gulp = require('gulp'),
	gutil = require('gulp-util'),
	watch = require('gulp-watch'),
	mergeDefaults = require('lodash.defaults'),
	through = require('through2'),
	less = require('less');

// Generates list of @import paths for a given Vinyl file
function getLessFileImports(file, options, cb) {
	var imports = [];

	// Support (file, cb) signature
	if(typeof options === 'function') {
		cb = options; options = null;
	}

	// Parse the filepath, using file path as `filename` option
	less.parse(file.contents.toString('utf8'), mergeDefaults({
		filename: file.path
	},
	options || {}),
	function(err, root, imports, options) {
		// Add a better error message / properties
		if (err) {
			err.lineNumber = err.line;
			err.fileName = err.filename;
			err.message = err.message + ' in file ' + err.fileName + ' line no. ' + err.lineNumber;
		}

		// Generate imports list from the files hash (sorted)
		var imports = Object.keys(imports.files).sort();

		cb(err, imports);
	});
};

// Tracks watch streams e.g. `{filepath}: stream`
var _streams = Object.create(null);

// Name of the event fired when @imports cause file to change
// (Overwrites the current file.event set by gulp-watch/gaze)
var changeEvent = 'changed:by:import';

// Import generator
function watchLessImports(file, options, cb, done) {
	var filePath = file.path,
		watchStream = _streams[filePath];

	// Generate an @import list via LESS...
	getLessFileImports(file, options.less, function(err, imports) {
		var oldImports;

		// Emit the error if one was returned
		if (err) { cb(new gutil.PluginError(PLUGIN_NAME, err)); }

		// If a previous watch stream is active...
		if(watchStream) {
			oldImports = watchStream._imports;

			// Check to ensure the @import arrays are identical.
			if(oldImports.length && oldImports.join() === imports.join()) {
				done(); return; // Don't do anything further!
			}

			// Clean up previous watch stream
			watchStream.end();
			watchStream.unpipe();
			watchStream.close();
			delete _streams[filePath];
		}

		// If we found some imports...
		if(imports.length) {
			// Generate new watch stream
			watchStream = _streams[filePath] = watch(imports, options, cb);

			// Expose @import list on the stream
			watchStream._imports = imports;
		}

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
				watchStream._gaze.emit('all', changeEvent, filePath);
			},
			cb);
		}

		// Otherwise exeute the callback logic immediately
		else { cb(); }

	}

	// Close all import watch streams when the watchStream ends
	watchStream.on('end', function() { Object.keys(_streams).forEach(closeStream); });

	// Pipe the watch stream into the imports watcher so whenever any of the
	// files change, we re-generate our @import watcher so removals/additions
	// are detected
	watchStream.pipe(through.obj(watchImportStream));

	// Return the stream;
	return watchStream;
};
