const PLUGIN_NAME = 'gulp-watch-less';

var gulp = require('gulp'),
	gutil = require('gulp-util'),
	watch = require('gulp-watch'),
	mergeDefaults = require('lodash.defaults'),
	through = require('through2'),
	less = require('less');

var treePrefix = '\u2514\u2500\u2500 ';

// Closes a given `gulp-watch` stream
function closeStream(stream) {
	if(stream) {
		stream.end();
		stream.unpipe();
		stream.close();
	}

	return stream;
}

function generateImportList(file, options, cb) {
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

function watchImports(parentStream, options) {
	var imports, 
		importStream;

	// Logging helper method
    function log(event, file) {
        var msg = [gutil.colors.magenta(file.relative), 'was', event];
        if (options.name) { msg.unshift(gutil.colors.cyan(options.name) + ' saw'); }
        gutil.log.apply(gutil, msg);
    }

	function push(watchedFile, enc, cb) {
		var stream = this;

		// Skip empty files
		if (watchedFile.isNull()) {
			this.push(watchedFile);
			cb(); return;
		}

		// Streams aren't supported
		if (watchedFile.isStream()) {
			this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
			cb(); return;
		}

		try {
			// Passthrough the file
			stream.push(watchedFile);

			// If the file has changed or we're in the initial passthrough state, we 
			// need to (re)parse the @import list for the file...
			if(!watchedFile.event || watchedFile.event === 'changed') {

				// Generate an @import list via LESS...
				generateImportList(watchedFile, options.less, function(err, parsedImports) {
					// Emit the error if one was returned
					if (err) { stream.emit('error', new gutil.PluginError(PLUGIN_NAME, err) ); }

					// If the import list hasn't changed.. no need to re-watch!
					if(imports && imports.join() === parsedImports.join()) { cb(); return; }

					// Overwrite previous imports
					imports = parsedImports;

					// If this is a subsequent gaze event (not initial setup) 
					if(watchedFile.event) {
						// Log out message
						gutil.log(treePrefix, gutil.colors.cyan('Detected @import additions/deletions, re-parsing...'));

						// If verbose logging is on, output the imports array
						!options.verbose && gutil.log(
							'\t'+treePrefix+gutil.colors.magenta('Watching'), 
							parsedImports.join('\n\t\t'+treePrefix+gutil.colors.magenta('Watching '))
						);
					}

					// Close the previous import stream
					closeStream(importStream);

					// Create a new watch stream that will watch the @import file list.
					importStream = watch(imports, options);

					// When any @import changes...
					importStream.pipe(through.obj(function(importFile, enc, cb) {
						log('affected by '+gutil.colors.magenta(importFile.relative)+' change', watchedFile);

						// Set custom event type on original file
						watchedFile.event = 'import:changed';

						// Re-push file onto parentStream
						parentStream.push(watchedFile);

						// Push it
						this.push(importFile); cb();
					}));

					cb();
				});

			}

			// No file parsing? Continue
			else { cb(); }
		}

		// Emit any errors
		catch (err) { this.emit('error', new gutil.PluginError(PLUGIN_NAME, err)); }
	};

	// Pipe the parentStream through our throughStream
	parentStream.pipe( through.obj(push) );

	// Return parent stream
	return parentStream;
}

module.exports = function (glob, options, done) {
	// No-op callback if not given
	if(!options) { options = {}; }
	if(!done) { done = function() {}; }

	// Merge defaults
	options = mergeDefaults(options, {
		name: 'LESS', // Use LESS name by default
		less: {} // No LESS options by default
	});

	// Generate a basic `gulp-watch` stream
	var watchStream = watchImports(
		watch(glob, options, done),
		options
	);

	// Glob immediately to ensure imports are parsed before
	// any changes occur
	gulp.src(glob).pipe(watchStream)

	// Close off all `importStreams` when `watchStream` closes
	watchStream.on('end', function() {
		Object.keys(_importStreams).forEach(function(stream, path) {
			stream.end();
			stream.unpipe();
			stream.close();
		});
	})

	return watchStream;
};