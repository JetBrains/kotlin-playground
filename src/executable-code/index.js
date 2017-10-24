import 'codemirror';
import 'codemirror/addon/runmode/colorize';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/groovy/groovy';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/shell/shell';
import merge from 'deepmerge';
import defaultConfig from '../config';
import { arrayFrom, getConfigFromElement, insertAfter } from '../utils';
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
    const targetNode = typeof target === 'string' ? document.querySelector(target) : target;
    const targetNodeStyle = targetNode.getAttribute('style');
    const highlightOnly = targetNode.hasAttribute('data-highlight-only');
    let targetPlatform = targetNode.getAttribute('data-target-platform');
    targetPlatform = targetPlatform !== null ? targetPlatform : "java";
    const code = targetNode.textContent.replace(/^\s+|\s+$/g, '');
    const cfg = merge(defaultConfig, config);

    targetNode.style.display = 'none';
    targetNode.setAttribute('data-kotlin-runcode-initialized', 'true');

    const mountNode = document.createElement('div');
    insertAfter(mountNode, targetNode);

    const view = ExecutableFragment.render(mountNode, { highlightOnly });
    view.update({
      code: code,
      compilerVersion: cfg.compilerVersion,
      highlightOnly: highlightOnly,
      targetPlatform: TargetPlatform.getById(targetPlatform)
    });

    this.config = cfg;
    this.node = mountNode;
    this.targetNode = targetNode;
    this.targetNodeStyle = targetNodeStyle;
    this.view = view;
  }

  destroy() {
    this.config = null;
    this.node = null;
    this.view.destroy();
    const targetNode = this.targetNode;

    if (this.targetNodeStyle !== null) {
      targetNode.style = this.targetNodeStyle;
    } else {
      targetNode.style = '';
    }

    targetNode.removeAttribute('data-kotlin-runcode-initialized');
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

          // Skip empty and already initialized nodes
          if (
            node.textContent.trim() === '' ||
            node.getAttribute('data-kotlin-runcode-initialized') === 'true'
          ) {
            return;
          }

          instances.push(new ExecutableCode(node, { compilerVersion, highlightOnly }));
        });

        return instances;
      });
  }
}
