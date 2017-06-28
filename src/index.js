import 'codemirror/addon/runmode/colorize';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/groovy/groovy';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/shell/shell';

import './scss/index.scss';

import ExecutableCode from './executable-code';

function init() {
  new ExecutableCode('.sample');
}

// IE9+ equivalent of $(document).ready(), trying to remove jQuery
if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading") {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init());
}
