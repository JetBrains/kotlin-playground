import ExecutableCode from './executable-code';
import { getCurrentScript, getConfigFromElement } from './utils';
import discourseAdapter from './discourse-adapter';

/**
 * @param {string} selector
 * @return {Promise<Array<ExecutableCode>>}
 */
export default function init(selector) {
  return ExecutableCode.create(selector);
}

// Backwards compatibility, should be removed in next major release
init.default = init;
init.discourse = discourseAdapter;

// Auto initialization via data-selector <script> attribute
const currentScript = getCurrentScript();
const config = getConfigFromElement(currentScript);

if (config.selector) {
  document.addEventListener('DOMContentLoaded', () => {
    init(config.selector);
  });
}
