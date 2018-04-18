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

function addObserverIfDesiredNodeAvailable() {
  let node = document.body;
  if(!node) {
    window.setTimeout(addObserverIfDesiredNodeAvailable,500);
    return;
  }
  let configObserver = {attributes: true, childList: true, subtree: true, attributeFilter : ['class']};
  new MutationObserver(function (mutations) {
    let isRunnable = false;
    mutations.forEach(function (mutation) {
      if (Array.prototype.slice.call(mutation.addedNodes).filter(node => node.className === "lang-run-kotlin").length > 0){
        isRunnable = true;
      }
    });
    if (isRunnable) {
      create(DiscourseSelectors.KOTLIN_CODE_BLOCK);
    }
  }).observe(node, configObserver);
}
addObserverIfDesiredNodeAvailable();
