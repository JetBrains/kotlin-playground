const mvn = require('node-java-maven');
const decompress = require('decompress');

mvn((err, mvnResults) => {
  if (err) {
    return console.error('could not resolve maven dependencies', err);
  }

  mvnResults.classpath.forEach((c) => {
    decompress(c, 'dist').then(files => {
      console.log('done!');
    });
  });
});
