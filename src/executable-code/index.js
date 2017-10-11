import 'codemirror';
import 'codemirror/addon/runmode/colorize';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/groovy/groovy';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/shell/shell';
import merge from 'deepmerge';
import defaultConfig from '../config';
import { arrayFrom, getConfigFromElement } from '../utils';
import WebDemoApi from "../webdemo-api";
import TargetPlatform from '../target-platform'
import ExecutableFragment from './executable-fragment';
import '../styles.scss';

export default class ExecutableCode {
  /**
   * @param {string|HTMLElement} target
   * @param {KotlinRunCodeConfig} [config]
   */
  constructor(target, config = {})   {
    const node = typeof target === 'string' ? document.querySelector(target) : target;
    const highlightOnly = node.hasAttribute('data-highlight-only');
    let targetPlatform = node.getAttribute('data-target-platform');
    targetPlatform = targetPlatform !== null ? targetPlatform : "java";
    const code = node.textContent.replace(/^\s+|\s+$/g, '');
    const cfg = merge.all([ defaultConfig, config ]);

    const executableFragmentContainer = document.createElement('div');
    node.parentNode.replaceChild(executableFragmentContainer, node);
    const view = ExecutableFragment.render(executableFragmentContainer);

    this.node = executableFragmentContainer;

    view.update({
      code: code,
      compilerVersion: cfg.compilerVersion,
      highlightOnly: highlightOnly,
      targetPlatform: TargetPlatform.getById(targetPlatform)
    });
  }

  /**
   * @param {string} selector
   * @param {boolean} highlightOnly
   * @return {Promise<Array<ExecutableCode>>}
   */
  static create(selector, highlightOnly) {
    const instances = [];
    const nodes = arrayFrom(document.querySelectorAll(selector));

    if (nodes.length === 0) {
      return instances;
    }

    return WebDemoApi.getCompilerVersions()
      .then((versions) => {
        nodes.forEach((node) => {
          const config = getConfigFromElement(node, true);
          const minCompilerVersion = config.minCompilerVersion;

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

          // Skip empty nodes
          if (node.textContent.trim() === '') {
            return;
          }

          instances.push(new ExecutableCode(node, { compilerVersion, highlightOnly }));
        });

        return instances;
      });
  }
}
