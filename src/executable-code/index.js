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

const INITED_ATTRIBUTE_NAME = 'data-kotlin-playground-initialized';

export default class ExecutableCode {
  /**
   * @param {string|HTMLElement} target
   * @param {KotlinPlayGroundConfig} [config]
   */
  constructor(target, config = {}) {
    const targetNode = typeof target === 'string' ? document.querySelector(target) : target;
    const targetNodeStyle = targetNode.getAttribute('style');
    const highlightOnly = targetNode.hasAttribute('data-highlight-only');
    const editorTheme = targetNode.hasAttribute('theme') ? targetNode.getAttribute('theme') : "default";
    const args = targetNode.hasAttribute('args') ? targetNode.getAttribute('args') : "";
    let targetPlatform = targetNode.getAttribute('data-target-platform');
    let jsLibs = targetNode.getAttribute('data-js-libs');
    let isFoldedButton = targetNode.getAttribute('folded-button') !== "false";
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
    if (targetPlatform === "js" || targetPlatform === "canvas") {
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
      theme: editorTheme,
      args: args,
      compilerVersion: cfg.compilerVersion,
      highlightOnly: highlightOnly,
      targetPlatform: TargetPlatform.getById(targetPlatform),
      jsLibs: additionalLibs,
      isFoldedButton: isFoldedButton
    });

    this.config = cfg;
    this.node = mountNode;
    this.targetNode = targetNode;
    this.targetNodeStyle = targetNodeStyle;
    this.view = view;

    targetNode.KotlinPlayground = this;
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
    delete targetNode.KotlinPlayground;
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
        let compilerVersion = null;
        let listOfVersions = versions.map(version => version.version);

        if (listOfVersions.includes(config.version)){
          compilerVersion = config.version;
        } else {
          versions.forEach((compilerConfig) => {
            if (compilerConfig.latestStable) {
              latestStableVersion = compilerConfig.version;
            }
          });
          compilerVersion = latestStableVersion;
        }

        if (minCompilerVersion) {
          compilerVersion = minCompilerVersion > latestStableVersion
            ? versions[versions.length - 1].version
            : latestStableVersion;
        }

        // Skip empty and already initialized nodes
        if (
          node.textContent.trim() === '' ||
          node.getAttribute('data-kotlin-playground-initialized') === 'true'
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
