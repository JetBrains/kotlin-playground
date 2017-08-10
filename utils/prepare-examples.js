const path = require('path');
const { cp, sed } = require('shelljs');

const projectDir = path.resolve(__dirname, '..');

cp('-R', `${projectDir}/dist/examples`, projectDir);

sed(
  '-i',
  '../runcode.js',
  'https://unpkg.com/kotlin-runcode/dist/runcode.min.js',
  `${projectDir}/examples/index.html`
);
