import ExecutableCode from './executable-code';
import {getConfigFromElement, getCurrentScript, waitForNode} from './utils';
import {
  default as discoursePreviewPanelHandler,
  Selectors as DiscourseSelectors
} from './discourse-preview-panel-handler';

/**
 *
 * @typedef {Object} eventFunctions
 * @property {Function} onChange
 * @property {Function} onTestPassed
 * @property {Function} onConsoleOpen
 * @property {Function} onConsoleClose
 * @property {Function} callBack
 *
 * @param {string} selector
 * @param {Function} eventFunctions
 * @return {Promise<Array<ExecutableCode>>}
 */
export default function create(selector, eventFunctions) {
  return ExecutableCode.create(selector, eventFunctions);
}

// Backwards compatibility, should be removed in next major release
create.default = create;

/**
 * Initialize Kotlin playground for Discourse platform
 * @param {string} selector
 * @return {Promise<Array<ExecutableCode>>}
 */
create.discourse = function (selector) {
  discoursePreviewPanelHandler();
  return create(selector);
};

// Auto initialization via data-selector <script> attribute
const currentScript = getCurrentScript();
const config = getConfigFromElement(currentScript);
const {selector, discourseSelector} = config;

if (selector || discourseSelector) {
  document.addEventListener('DOMContentLoaded', () => {
    if (discourseSelector) {
      create.discourse(discourseSelector);
      waitForNode(DiscourseSelectors.PREVIEW_PANEL, () => discoursePreviewPanelHandler());
    } else {
      create(selector);
    }
  });
}
