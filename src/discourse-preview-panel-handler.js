/**
 * This will handle user input changes and render editor in the preview panel
 */
import debounce from 'debounce';

import { arrayFrom } from './utils';

export const Selectors = {
  PREVIEW_PANEL: '.d-editor-preview',
  PREVIEW_TEXTAREA: '.d-editor-input.ember-text-area',
  KOTLIN_CODE_BLOCK: '.lang-run-kotlin',
};

const DEBOUNCE_TIME = 300;

export default function () {
  const kotlinRunCodeGlobalObject = window[__LIBRARY_NAME__];
  const textarea = document.querySelector(Selectors.PREVIEW_TEXTAREA);
  const previewPanel = document.querySelector(Selectors.PREVIEW_PANEL);

  if (!textarea || !previewPanel) {
    return;
  }

  textarea.addEventListener('keydown', debounce(() => {
    const previewCodeBlocks = previewPanel.querySelectorAll(Selectors.KOTLIN_CODE_BLOCK);

    arrayFrom(previewCodeBlocks).forEach(node => {
      const previousKotlinRunCodeInstance = node[__LIBRARY_NAME__];
      if (previousKotlinRunCodeInstance) {
        previousKotlinRunCodeInstance.destroy();
      }
      kotlinRunCodeGlobalObject(node);
    });
  }, DEBOUNCE_TIME));
}
