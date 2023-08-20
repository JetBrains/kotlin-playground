export const WIDGET_SELECTOR = '.executable-fragment-wrapper';
export const RUN_SELECTOR = '.run-button';
export const CLOSE_SELECTOR = '.console-close';
export const OUTPUT_SELECTOR = '.output-wrapper';
export const LOADER_SELECTOR = `${OUTPUT_SELECTOR} > .loader`;
export const RESULT_SELECTOR = `${OUTPUT_SELECTOR} > .code-output`;

export const TARGET_SELECTOR = '.compiler-info__target';
export const OPEN_EDITOR_SELECTOR = '.compiler-info__open-editor';
export const VERSION_SELECTOR = '.compiler-info__version';

export function editorLine(number: number) {
  return `.CodeMirror-code .CodeMirror-line:nth-child(${number})`;
}

export function editorString(text: string) {
  return `.cm-string:text("${text}")`;
}
