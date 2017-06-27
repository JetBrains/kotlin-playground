import $ from 'jquery';

const ExecutableCode = require('./executable-code');

// Bring in codemirror
require('codemirror/addon/runmode/colorize.js');
require('codemirror/mode/clike/clike.js');
require('codemirror/mode/groovy/groovy.js');
require('codemirror/mode/xml/xml.js');
require('codemirror/mode/javascript/javascript.js');
require('codemirror/mode/shell/shell.js');


$(document).ready(function () {
    new ExecutableCode('.sample');
    console.log(99);
});
