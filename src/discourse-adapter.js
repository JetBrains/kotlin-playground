import debounce from 'debounce';

import { arrayFrom } from './utils';

const Selectors = {
  PREVIEW_PANEL: '.d-editor-preview',
  PREVIEW_TEXTAREA: '.d-editor-input.ember-text-area',
  KOTLIN_CODE_BLOCK: '.lang-run-kotlin',
};

const DEBOUNCE_TIME = 300;
const kotlinRunCodeGlobalObject = window[__LIBRARY_NAME__];

export default function () {
  const textarea = document.querySelector(Selectors.PREVIEW_TEXTAREA);
  const previewPanel = document.querySelector(Selectors.PREVIEW_PANEL);

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
