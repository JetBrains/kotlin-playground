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

const configObserver = { attributes: true, childList: true, attributeFilter: ['class']};
const discourseHost = "discuss.kotlinlang.org";

function waitForDiscourseDocument() {
  const interval = setInterval(() => {
    const node =  document.body;
    if (node) {
      clearInterval(interval);
      observer.observe(node, configObserver);
    }
  }, 500);
}

export const observer = new MutationObserver(function (mutations) {
  let isRunnable = false;
  mutations.forEach(function (mutation) {
    Array.prototype.slice.call(mutation.addedNodes).forEach(node => {
      if (validateNodes(node)) isRunnable = true;
    });
  });
  if (isRunnable) create.discourse(DiscourseSelectors.KOTLIN_CODE_BLOCK);
});

function validateNodes(node) {
  return node.nodeType === Node.ELEMENT_NODE && document.getElementsByClassName(DiscourseSelectors.KOTLIN_CODE_BLOCK.substring(1)).length > 0;
}

if (window.location.host === discourseHost) waitForDiscourseDocument();
