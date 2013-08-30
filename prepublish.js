var child_process = require("child_process");
child_process.exec('coffee -o lib/ -c src/',function(err) {
	if(err && err.code !== 0) {
		console.error("Failed to build coffee files.");
		process.exit(1);
	}
});
