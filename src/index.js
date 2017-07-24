import 'codemirror';
import 'codemirror/addon/runmode/colorize';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/groovy/groovy';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/shell/shell';

import './scss/index.scss';

import ExecutableCode from './executable-code';
import WebDemoApi from "./executable-code/webdemo-api";

function arrayFrom(arrayLike) {
  return Array.prototype.slice.call(arrayLike, 0);
}

export default function(selector) {
  const nodes = arrayFrom(document.querySelectorAll(selector));
  const compilerVersionsPromise = WebDemoApi.getCompilerVersions();

  return compilerVersionsPromise.then((versions) => {
    nodes.forEach((node) => {
      const minCompilerVersion = node.getAttribute('data-min-compiler-version');

      let latestStableVersion = null;

      versions.forEach((compilerConfig) => {
        if (compilerConfig.latestStable) {
          latestStableVersion = compilerConfig.version;
        }
      });

      let compilerVersion = latestStableVersion;

      if (minCompilerVersion) {
        compilerVersion = minCompilerVersion > latestStableVersion
          ? versions[versions.length - 1].version
          : latestStableVersion;
      }

      return new ExecutableCode(node, compilerVersion);
    });
  });
}
