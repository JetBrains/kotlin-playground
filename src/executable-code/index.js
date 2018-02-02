import 'codemirror';
import 'codemirror/lib/codemirror';
import 'codemirror/addon/hint/show-hint'
import 'codemirror/addon/hint/anyword-hint'
import 'codemirror/mode/smalltalk/smalltalk'
import 'codemirror/addon/runmode/colorize';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/groovy/groovy';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/shell/shell';
import merge from 'deepmerge';
import Set from 'es6-set/polyfill';
import defaultConfig, {API_URLS} from '../config';
import {arrayFrom, getConfigFromElement, insertAfter} from '../utils';
import WebDemoApi from "../webdemo-api";
import TargetPlatform from '../target-platform'
import ExecutableFragment from './executable-fragment';
import '../styles.scss';

const INITED_ATTRIBUTE_NAME = 'data-kotlin-runcode-initialized';

export default class ExecutableCode {
  /**
   * @param {string|HTMLElement} target
   * @param {KotlinRunCodeConfig} [config]
   */
  constructor(target, config = {}) {
    const targetNode = typeof target === 'string' ? document.querySelector(target) : target;
    const targetNodeStyle = targetNode.getAttribute('style');
    const highlightOnly = targetNode.hasAttribute('data-highlight-only');
    let targetPlatform = targetNode.getAttribute('data-target-platform');
    let jsLibs = targetNode.getAttribute('data-js-libs');
    targetPlatform = targetPlatform !== null ? targetPlatform : "java";
    const code = targetNode.textContent.replace(/^\s+|\s+$/g, '');
    const cfg = merge(defaultConfig, config);

    /*
      additionalLibs - setting additional JS-library
      Setting JQuery as default JS library
     */
    let additionalLibs;
    targetNode.style.display = 'none';
    targetNode.setAttribute(INITED_ATTRIBUTE_NAME, 'true');
    if (targetPlatform === "js") {
      additionalLibs = new Set(API_URLS.JQUERY.split());
      if (jsLibs !== null) {
        let checkUrl = new RegExp("https?://.+\.js$");
        jsLibs
          .replace(" ", "")
          .split(",")
          .filter(lib => checkUrl.test(lib))
          .forEach(lib => additionalLibs.add(lib));
      }
    }
    const mountNode = document.createElement('div');
    insertAfter(mountNode, targetNode);

    const view = ExecutableFragment.render(mountNode, {highlightOnly});
    view.update({
      code: code,
      compilerVersion: cfg.compilerVersion,
      highlightOnly: highlightOnly,
      targetPlatform: TargetPlatform.getById(targetPlatform),
      jsLibs: additionalLibs
    });

    this.config = cfg;
    this.node = mountNode;
    this.targetNode = targetNode;
    this.targetNodeStyle = targetNodeStyle;
    this.view = view;

    targetNode.KotlinRunCode = this;
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

    targetNode.removeAttribute(INITED_ATTRIBUTE_NAME);
    delete targetNode.KotlinRunCode;
  }

  isInited() {
    const node = this.targetNode;
    const attr = node && node.getAttribute(INITED_ATTRIBUTE_NAME);
    return attr && attr === 'true';
  }

  /**
   * @param {string|Node|NodeList} target
   * @param {boolean} highlightOnly
   * @return {Promise<Array<ExecutableCode>>}
   */
  static create(target, highlightOnly) {
    let targetNodes;

    if (typeof target === 'string') {
      targetNodes = arrayFrom(document.querySelectorAll(target));
    } else if (target instanceof Node) {
      targetNodes = [target];
    } else if (target instanceof NodeList === false) {
      throw new Error(`'target' type should be string|Node|NodeList, ${typeof target} given`);
    }

    // Return empty array if there is no nodes attach to
    if (targetNodes.length === 0) {
      return Promise.resolve([]);
    }

    return WebDemoApi.getCompilerVersions().then((versions) => {
      const instances = [];

      targetNodes.forEach((node) => {
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

        instances.push(new ExecutableCode(node, {
          compilerVersion,
          highlightOnly
        }));
      });

      return instances;
    });
  }
}
