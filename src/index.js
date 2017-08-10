import ExecutableCode from './executable-code';
import { getCurrentScript, getConfigFromElement } from './utils';

/**
 * @param {string} selector
 * @return {Promise<Array<ExecutableCode>>}
 */
export default function init(selector) {
  return ExecutableCode.create(selector);
}

// Auto initialization via data-selector <script> attribute
const currentScript = getCurrentScript();
const config = getConfigFromElement(currentScript);

if (config.selector) {
  document.addEventListener('DOMContentLoaded', () => {
    init(config.selector);
  });
}
