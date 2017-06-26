import $ from 'jquery';
const CodeMirror = require('./codemirror/CodeMirror');
const ExecutableCode = require('./executable-code');
require('./executable-code/executable-fragment.scss');

$(document).ready(function () {
    new ExecutableCode('.sample');
});
