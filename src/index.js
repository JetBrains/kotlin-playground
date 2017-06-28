import $ from 'jquery';
import 'codemirror/addon/runmode/colorize';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/groovy/groovy';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/shell/shell';

import './scss/index.scss';

import ExecutableCode from './executable-code';

$(document).ready(function () {
  new ExecutableCode('.sample');
});

