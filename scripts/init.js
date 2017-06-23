const CodeMirror = require('./codemirror/CodeMirror');
const ExecutableCode = require('./executable-code');

$(document).ready(function () {
    new ExecutableCode('.sample');
});
