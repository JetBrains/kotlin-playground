import 'codemirror';
import 'codemirror/lib/codemirror';
import 'codemirror/addon/hint/show-hint'
import 'codemirror/addon/hint/anyword-hint'
import 'codemirror/addon/scroll/simplescrollbars'
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
import 'codemirror/mode/swift/swift';
import merge from 'deepmerge';
import Set from 'es6-set/polyfill';
import defaultConfig, {API_URLS} from '../config';
import {arrayFrom, getConfigFromElement, insertAfter, READ_ONLY_TAG, replaceWhiteSpaces, THEMES} from '../utils';
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
  FROM: 'from',
  TO: 'to',
  NONE_MARKERS: 'none-markers',
  THEME: 'theme',
  MODE: 'mode',
  MATCH_BRACKETS: 'match-brackets',
  OUTPUT_HEIGHT: 'data-output-height',
  COMPLETE: 'data-autocomplete',
  ON_FLY_HIGHLIGHT: 'highlight-on-fly',
  PLATFORM: 'data-target-platform',
  JS_LIBS: 'data-js-libs',
  FOLDED_BUTTON: 'folded-button',
  ARGUMENTS: 'args',
  LINES: 'lines',
  AUTO_INDENT: 'auto-indent'
};

const MODES = {
  JAVA: "text/x-java",
  KOTLIN: "text/x-kotlin",
  JS: "text/javascript",
  GROOVY: "text/x-groovy",
  XML: "text/html",
  C: "text/x-c",
  OBJ_C: "text/x-objectivec",
  SWIFT: "text/x-swift",
  SHELL: "text/x-sh"
};

export default class ExecutableCode {
  /**
   * @param {string|HTMLElement} target
   * @param {{compilerVersion: *}} [config]
   * @param {Object} eventFunctions
   */
  constructor(target, config = {}, eventFunctions) {
    const targetNode = typeof target === 'string' ? document.querySelector(target) : target;
    let highlightOnly = config.highlightOnly ? true
      : targetNode.getAttribute(ATTRIBUTES.HIGHLIGHT_ONLY) === READ_ONLY_TAG
        ? targetNode.getAttribute(ATTRIBUTES.HIGHLIGHT_ONLY)
        : targetNode.hasAttribute(ATTRIBUTES.HIGHLIGHT_ONLY);
    const noneMarkers = targetNode.hasAttribute(ATTRIBUTES.NONE_MARKERS);
    const indent = targetNode.hasAttribute(ATTRIBUTES.INDENT) ? parseInt(targetNode.getAttribute(ATTRIBUTES.INDENT)) : DEFAULT_INDENT;
    const from = targetNode.hasAttribute(ATTRIBUTES.FROM) ? parseInt(targetNode.getAttribute(ATTRIBUTES.FROM)) : null;
    const to = targetNode.hasAttribute(ATTRIBUTES.TO) ? parseInt(targetNode.getAttribute(ATTRIBUTES.TO)) : null;
    const editorTheme = this.getTheme(targetNode);
    const args = targetNode.hasAttribute(ATTRIBUTES.ARGUMENTS) ? targetNode.getAttribute(ATTRIBUTES.ARGUMENTS) : "";
    const hiddenDependencies = this.getHiddenDependencies(targetNode);
    const outputHeight = targetNode.getAttribute(ATTRIBUTES.OUTPUT_HEIGHT) || null;
    const targetPlatform = TargetPlatform.getById(targetNode.getAttribute(ATTRIBUTES.PLATFORM));
    const targetNodeStyle = targetNode.getAttribute(ATTRIBUTES.STYLE);
    const jsLibs = this.getJsLibraries(targetNode, targetPlatform);
    const isFoldedButton = targetNode.getAttribute(ATTRIBUTES.FOLDED_BUTTON) !== "false";
    const lines = targetNode.getAttribute(ATTRIBUTES.LINES) === "true";
    const onFlyHighLight = targetNode.getAttribute(ATTRIBUTES.ON_FLY_HIGHLIGHT) === "true";
    const autoComplete = targetNode.getAttribute(ATTRIBUTES.COMPLETE) === "true";
    const matchBrackets = targetNode.getAttribute(ATTRIBUTES.MATCH_BRACKETS) === "true";
    const autoIndent = targetNode.getAttribute(ATTRIBUTES.AUTO_INDENT) === "true";
    const mode = this.getMode(targetNode);
    const code = replaceWhiteSpaces(targetNode.textContent);
    const cfg = merge(defaultConfig, config);

    // no run code in none kotlin mode
    if (mode !== MODES.KOTLIN && highlightOnly !== READ_ONLY_TAG) {
      highlightOnly = true;
    }

    targetNode.style.display = 'none';
    targetNode.setAttribute(INITED_ATTRIBUTE_NAME, 'true');
    const mountNode = document.createElement('div');
    insertAfter(mountNode, targetNode);

    const view = ExecutableFragment.render(mountNode, {eventFunctions});
    view.update(Object.assign({
      code: code,
      lines: lines,
      theme: editorTheme,
      indent: indent,
      args: args,
      mode: mode,
      matchBrackets: matchBrackets,
      from: from,
      to: to,
      autoComplete: autoComplete,
      hiddenDependencies: hiddenDependencies,
      compilerVersion: cfg.compilerVersion,
      noneMarkers: noneMarkers,
      onFlyHighLight: onFlyHighLight,
      autoIndent: autoIndent,
      highlightOnly: highlightOnly,
      targetPlatform: targetPlatform,
      jsLibs: jsLibs,
      isFoldedButton: isFoldedButton,
      outputHeight
    }, eventFunctions));

    this.config = cfg;
    this.node = mountNode;
    this.targetNode = targetNode;
    this.targetNodeStyle = targetNodeStyle;
    this.view = view;

    targetNode.KotlinPlayground = this;
    if (eventFunctions && eventFunctions.callback) eventFunctions.callback(targetNode, mountNode);
  }

  /**
   * Get all nodes values by {ATTRIBUTES.HIDDEN_DEPENDENCY} selector.
   * Node should be `textarea`.
   * @param targetNode - {NodeElement}
   * @returns {Array} - list of node's text content
   */
  getHiddenDependencies(targetNode) {
    return arrayFrom(targetNode.getElementsByClassName(ATTRIBUTES.HIDDEN_DEPENDENCY))
      .reduce((acc, node) => {
        node.parentNode.removeChild(node);
        return [...acc, replaceWhiteSpaces(node.textContent)];
      }, [])
  }

  /**
   * Add additional JS-library.
   * Setting JQuery as default library.
   * @param targetNode - {NodeElement}
   * @param platform - {TargetPlatform}
   * @returns {Set} - set of additional libraries
   */
  getJsLibraries(targetNode, platform) {
    if (platform === TargetPlatform.JS || platform === TargetPlatform.CANVAS) {
      const jsLibs = targetNode.getAttribute(ATTRIBUTES.JS_LIBS);
      let additionalLibs = new Set(API_URLS.JQUERY.split());
      if (jsLibs) {
        let checkUrl = new RegExp("https?://.+$");
        jsLibs
          .replace(" ", "")
          .split(",")
          .filter(lib => checkUrl.test(lib))
          .forEach(lib => additionalLibs.add(lib));
      }
      return additionalLibs;
    }
  }

  getTheme(targetNode) {
    const theme = targetNode.getAttribute(ATTRIBUTES.THEME);
    switch (theme) {
      case THEMES.DARCULA:
        return THEMES.DARCULA;
      case THEMES.IDEA:
        return THEMES.IDEA;
      default:
        return THEMES.DEFAULT;
    }
  }

  getMode(targetNode) {
    const mode = targetNode.getAttribute(ATTRIBUTES.MODE);
    switch (mode) {
      case "java":
        return MODES.JAVA;
      case "c":
        return MODES.C;
      case "js":
        return MODES.JS;
      case "groovy":
        return MODES.GROOVY;
      case "xml":
        return MODES.XML;
      case "shell":
        return MODES.SHELL;
      case "obj-c":
        return MODES.OBJ_C;
      case "swift":
        return MODES.SWIFT;
      default:
        return MODES.KOTLIN;
    }
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
   * @param {Object} options
   * @return {Promise<Array<ExecutableCode>>}
   */
  static create(target, options) {
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

        // Skip empty and already initialized nodes
        if (
          node.textContent.trim() === '' ||
          node.getAttribute(INITED_ATTRIBUTE_NAME) === 'true'
        ) {
          return;
        }

        if (versions) {
          let listOfVersions = versions.map(version => version.version);

          if (listOfVersions.includes(config.version)) {
            compilerVersion = config.version;
          } else if (listOfVersions.includes(options.version)) {
            compilerVersion = options.version;
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
          instances.push(new ExecutableCode(node, {compilerVersion}, options));
        } else {
          console.error('Cann\'t get kotlin version from server');
          instances.push(new ExecutableCode(node, {highlightOnly: true}));
        }
      });

      return instances;
    });
  }
}
