import { expect, Page, test } from '@playwright/test';

import { readFileSync } from 'fs';
import { join } from 'path';

import { gotoHtmlWidget } from './utils/server/playground';
import { RESULT_SELECTOR, WIDGET_SELECTOR } from './utils/selectors';
import { checkRunCase, prepareNetwork, printlnCode, toPostData } from './utils';
import { makeJSPrintCode } from './utils/mocks/wasm-1.9/result';

const WASM_1_9 = JSON.parse(
  readFileSync(join(__dirname, 'utils/mocks/wasm-1.9/wasm.json'), 'utf-8'),
);

const JS_1_9 = Object.freeze({
  jsCode: makeJSPrintCode('Hello, world!'),
  errors: { 'File.kt': [] },
  exception: null,
  text: '',
});

const OUTPUTS = Object.freeze({
  'js-ir': JS_1_9,
  wasm: WASM_1_9,
});

test.describe('WASM platform with `moduleId` in output', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await prepareNetwork(page, baseURL); // offline mode
  });

  test('JS 1.9 server response', async ({ page }) => {
    await run(page, 'js-ir');
  });

  test('WASM 1.9 server response', async ({ page }) => {
    await run(page, 'wasm');
  });
});

async function run(page: Page, platform: keyof typeof OUTPUTS) {
  const version = '1.9.20';
  const text = 'Hello, world!';
  const source = printlnCode(text);
  await gotoHtmlWidget(
    page,
    { selector: 'code', version },
    `<code data-target-platform='${platform}'>${source}</code>`,
  );
  const editor = page.locator(WIDGET_SELECTOR);
  const postData = `{"args":"","files":[{"name":"File.kt","text":"${toPostData(source)}","publicId":""}],"confType":"${platform}"}`;
  await checkRunCase(page, editor, postData, { json: OUTPUTS[platform] });
  await expect(editor.locator(RESULT_SELECTOR)).toHaveText(text);
}
