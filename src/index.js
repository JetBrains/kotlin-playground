import {API_URLS, RUNTIME_CONFIG} from './config';
import ExecutableCode from './executable-code';
import {waitForNode} from './utils';
import {
  default as discoursePreviewPanelHandler,
  Selectors as DiscourseSelectors
} from './discourse-preview-panel-handler';
// support IE11
import {polyfill} from "es6-promise";

polyfill();


/**
 * @typedef {Object} options
 * @property {string} server
 * @property {Function} onChange
 * @property {Function} onTestPassed
 * @property {Function} onTestFailed
 * @property {Function} onRun
 * @property {Function} onError
 * @property {Function} onConsoleOpen
 * @property {Function} onConsoleClose
 * @property {Function} callBack
 *
 * @param {string} selector
 * @param {Object} options
 * @return {Promise<Array<ExecutableCode>>}
 */
export default function create(selector, options = {}) {
  API_URLS.server = options.server || API_URLS.server;
  return ExecutableCode.create(selector, options);
}

// Backwards compatibility, should be removed in next major release
create.default = create;

/**
 * Initialize Kotlin playground for Discourse platform
 * @param {string} selector
 * @param {Object} options
 * @return {Promise<Array<ExecutableCode>>}
 */
create.discourse = function (selector, options) {
  discoursePreviewPanelHandler();
  return create(selector, options);
};

// Auto initialization via data-selector <script> attribute
const {selector, discourseSelector, ...options} = RUNTIME_CONFIG;

if (selector || discourseSelector) {
  document.addEventListener('DOMContentLoaded', () => {
    if (discourseSelector) {
      create.discourse(discourseSelector, options);
      waitForNode(DiscourseSelectors.PREVIEW_PANEL, () => discoursePreviewPanelHandler());
    } else {
      create(selector, options);
    }
  });
}
