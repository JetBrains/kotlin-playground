const mvn = require('node-java-maven');
const decompress = require('decompress');

const necessaryFiles = [
  "skiko.wasm",
  "skiko.mjs"
]

mvn((err, mvnResults) => {
  if (err) {
    return console.error('could not resolve maven dependencies', err);
  }

  mvnResults.classpath.forEach((c) => {
    decompress(
      c,
      'skiko',
      {
        filter: file => necessaryFiles.some(path => path === file.path)
      }
    ).then(files => {
      console.log('done!');
    });
  });
});
