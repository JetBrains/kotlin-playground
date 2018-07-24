import 'codemirror';
import 'codemirror/lib/codemirror';
import 'codemirror/addon/hint/show-hint'
import 'codemirror/addon/hint/anyword-hint'
import 'codemirror/mode/smalltalk/smalltalk'
import 'codemirror/addon/runmode/colorize';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/groovy/groovy';
import 'codemirror/mode/xml/xml';
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/addon/comment/comment'
import 'codemirror/addon/comment/continuecomment'
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/shell/shell';
import merge from 'deepmerge';
import Set from 'es6-set/polyfill';
import defaultConfig, {API_URLS} from '../config';
import {arrayFrom, getConfigFromElement, insertAfter, replaceWhiteSpaces, THEMES} from '../utils';
import WebDemoApi from "../webdemo-api";
import TargetPlatform from '../target-platform'
import ExecutableFragment from './executable-fragment';
import '../styles.scss';

const INITED_ATTRIBUTE_NAME = 'data-kotlin-playground-initialized';
const DEFAULT_INDENT = 4;

const ATTRIBUTES = {
  HIDDEN_DEPENDENCY: 'hidden-dependency',
  INDENT: 'indent',
  HIGHLIGHT_ONLY: 'data-highlight-only',
  STYLE: 'style',
  NONE_MARKERS: 'none-markers',
  THEME: 'theme',
  ON_FLY_HIGHLIGHT: 'on-fly-highlight',
  PLATFORM: 'data-target-platform',
  JS_LIBS: 'data-js-libs',
  FOLDED_BUTTON: 'folded-button',
  ARGUMENTS: 'args',
  LINES: 'lines',
  AUTO_INDENT: 'auto-indent'
};

export default class ExecutableCode {
  /**
   * @param {string|HTMLElement} target
   * @param {KotlinPlayGroundConfig} [config]
   */
  constructor(target, config = {}) {
    const targetNode = typeof target === 'string' ? document.querySelector(target) : target;
    const highlightOnly = targetNode.hasAttribute(ATTRIBUTES.HIGHLIGHT_ONLY);
    const noneMarkers = targetNode.hasAttribute(ATTRIBUTES.NONE_MARKERS);
    const indent = targetNode.hasAttribute(ATTRIBUTES.INDENT) ? parseInt(targetNode.getAttribute(ATTRIBUTES.INDENT)) : DEFAULT_INDENT;
    const editorTheme = targetNode.hasAttribute(ATTRIBUTES.THEME) ? targetNode.getAttribute(ATTRIBUTES.THEME) : THEMES.DEFAULT;
    const args = targetNode.hasAttribute(ATTRIBUTES.ARGUMENTS) ? targetNode.getAttribute(ATTRIBUTES.ARGUMENTS) : "";
    const hiddenDependencies = this.getHiddenDependencies(targetNode);
    let targetPlatform = targetNode.getAttribute(ATTRIBUTES.PLATFORM);
    const targetNodeStyle = targetNode.getAttribute(ATTRIBUTES.STYLE);
    let jsLibs = targetNode.getAttribute(ATTRIBUTES.JS_LIBS);
    let isFoldedButton = targetNode.getAttribute(ATTRIBUTES.FOLDED_BUTTON) !== "false";
    const lines = targetNode.getAttribute(ATTRIBUTES.LINES) === "true";
    const onFlyHighLight = targetNode.getAttribute(ATTRIBUTES.ON_FLY_HIGHLIGHT) === "true";
    const autoIndent = targetNode.getAttribute(ATTRIBUTES.AUTO_INDENT) !== "false";
    targetPlatform = targetPlatform !== null ? targetPlatform : TargetPlatform.JAVA.id;
    const code = replaceWhiteSpaces(targetNode.textContent);
    const cfg = merge(defaultConfig, config);

    /*
      additionalLibs - setting additional JS-library
      Setting JQuery as default JS library
     */
    let additionalLibs;
    targetNode.style.display = 'none';
    targetNode.setAttribute(INITED_ATTRIBUTE_NAME, 'true');
    if (targetPlatform === TargetPlatform.JS.id || targetPlatform === TargetPlatform.CANVAS.id) {
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
      lines: lines,
      theme: editorTheme,
      indent: indent,
      args: args,
      hiddenDependencies: hiddenDependencies,
      compilerVersion: cfg.compilerVersion,
      noneMarkers: noneMarkers,
      onFlyHighLight: onFlyHighLight,
      autoIndent: autoIndent,
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

  /**
   * Get all nodes values by {ATTRIBUTES.HIDDEN_DEPENDENCY} selector.
   * Node should be `textarea`.
   * @param targetNode - {NodeElement}
   * @returns {Array} - list of node's text content
   */
  getHiddenDependencies(targetNode){
   return arrayFrom(targetNode.getElementsByClassName(ATTRIBUTES.HIDDEN_DEPENDENCY))
      .reduce((acc, node) => {
        node.parentNode.removeChild(node);
        return [...acc, replaceWhiteSpaces(node.textContent)];
      }, [])
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

        if (listOfVersions.includes(config.version)) {
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
          node.getAttribute(INITED_ATTRIBUTE_NAME) === 'true'
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
