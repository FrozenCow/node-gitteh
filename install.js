var async = require("async"),
	child_process = require("child_process"),
	spawn = child_process.spawn,
	path = require("path"),
	request = require('request'),
	fs = require('fs'),
	tar = require('tar'),
	zlib = require('zlib');

function exec(/*...*/) {
	var args = Array.prototype.slice.call(arguments);
	var cmd = args.splice(0, 1)[0];
	var opts = {};
	if(typeof(args.slice(-1)[0]) === "object") {
		opts = args.splice(-1)[0];
	}

	return function(cb) {
		var child = spawn(cmd, args, opts);
		child.stdout.pipe(process.stdout);
		child.stderr.pipe(process.stderr);
		child.on("exit", cb);
	};
}

function log(/*...*/) {
	var args = arguments;
	return function(cb) {
		console.log.apply(console,args);
		cb();
	};
}

function skip(callback) {
	callback();
}

var libgit2Dir = path.join(__dirname, "deps/libgit2");
var buildDir = path.join(libgit2Dir, "build");
async.series([
	log('Retrieving libgit2...'),
	(fs.existsSync(path.join(__dirname, '.git'))
		? exec('git','submodule','update','--init')
		: function(cb) {
			request({url: 'https://github.com/libgit2/libgit2/tarball/v0.19.0'})
				.pipe(zlib.createUnzip())
				.pipe(tar.Extract({
					path: libgit2Dir,
					strip: true
				}))
				.on('end', cb);
		}),
	log('Building libgit2...'),
	exec('mkdir','-p',buildDir),
	exec('cmake',"-DCMAKE_C_FLAGS='-fPIC'",'-DTHREADSAFE=1', '-DBUILD_CLAR=0', '..', {cwd: buildDir}),
	exec('cmake', '--build', '.', {cwd: buildDir}),
	log('Building gitteh...'),
	exec('./node_modules/.bin/node-gyp','configure'),
	exec('./node_modules/.bin/node-gyp','build'),
	log('Checking coffeescript compilation...'),
	(fs.existsSync(path.join(__dirname, 'lib/gitteh.js'))
		? skip
		: exec('coffee', '-o', 'lib/', '-c', 'src/'))
], function(err) {
	if(err) process.exit(err);
});
