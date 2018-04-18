import ExecutableCode from './executable-code';
import {getConfigFromElement, getCurrentScript, waitForNode} from './utils';
import {
  default as discoursePreviewPanelHandler,
  Selectors as DiscourseSelectors
} from './discourse-preview-panel-handler';

/**
 * @param {string} selector
 * @return {Promise<Array<ExecutableCode>>}
 */
export default function create(selector) {
  return ExecutableCode.create(selector);
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
const { selector, discourseSelector } = config;

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

let target = document.documentElement || document.body;
let configObserver = {attributes: true, childList: true, subtree: true, attributeFilter : ['class']};

new MutationObserver(function (mutations, observer) {
  let isRunnable = false;
  mutations.forEach(function (mutation) {
    if (mutation.target.className === "lang-run-kotlin") isRunnable = true;
  });
  if (isRunnable) create(DiscourseSelectors.KOTLIN_CODE_BLOCK);
  observer.disconnect();
}).observe(target, configObserver);
