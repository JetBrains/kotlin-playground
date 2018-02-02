import ExecutableCode from './executable-code';
import { getCurrentScript, getConfigFromElement } from './utils';
import discoursePreviewPanelHandler from './discourse-preview-panel-handler';

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
    } else {
      create(selector);
    }
  });
}
