const path = require('path');
const { cp, sed } = require('shelljs');

const projectDir = path.resolve(__dirname, '..');

cp('-R', `${projectDir}/dist/examples`, projectDir);

sed(
  '-i',
  '../playground.js',
  'https://unpkg.com/kotlin-playground@1/dist/playground.min.js',
  `${projectDir}/examples/index.html`
);
