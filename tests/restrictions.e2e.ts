import { expect, Page, test } from '@playwright/test';

import { readFileSync } from 'fs';
import { join } from 'path';

import { gotoHtmlWidget } from './utils/server/playground';

import { RESULT_SELECTOR, WIDGET_SELECTOR } from './utils/selectors';

import { prepareNetwork, printlnCode } from './utils';
import { mockRunRequest, waitRunRequest } from './utils/mocks/compiler';
import { runButton } from './utils/interactions';
import { makeJSPrintCode } from './utils/mocks/wasm/result';

const WASM = JSON.parse(
  readFileSync(join(__dirname, 'utils/mocks/wasm/wasm.json'), 'utf-8'),
);

const JS_IR = Object.freeze({
  jsCode: makeJSPrintCode('Hello, world!'),
  errors: { 'File.kt': [] },
  exception: null,
  text: '<outStream>Hello, world!\n</outStream>',
});

const OUTPUTS = Object.freeze({
  'js-ir': JS_IR,
  wasm: WASM,
});

const VERSIONS = [
  { version: '1.3.10' },
  { version: '1.9.20', latestStable: true },
  { version: '2.0.1' },
] as const;

test.describe('platform restrictions', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await prepareNetwork(page, baseURL, {
      versions: (route) =>
        route.fulfill({
          body: JSON.stringify(VERSIONS),
        }),
    }); // offline mode
  });

  test('JS_IR for unsupported version', async ({ page }) => {
    await shouldFailedRun(
      page,
      'js-ir',
      '1.3.10',
      'JS IR compiler backend accessible only since 1.5.0 version',
    );
  });

  test('JS_IR for supported by minor version', async ({ page }) => {
    await shouldSuccessRun(page, 'js-ir', '1.9.0');
  });

  test('JS_IR for supported by major version', async ({ page }) => {
    await shouldSuccessRun(page, 'js-ir', '2.0.1');
  });

  test('WASM for unsupported version', async ({ page }) => {
    await shouldFailedRun(
      page,
      'wasm',
      '1.3.10',
      'Wasm compiler backend accessible only since 1.9.0 version',
    );
  });

  test('WASM for supported by minor version', async ({ page, browserName }) => {
    test.skip(
      browserName !== 'chromium',
      "WASM doesn't supported in this browser",
    );
    await shouldSuccessRun(page, 'wasm', '1.9.0');
  });

  test('WASM for supported by major version', async ({ page, browserName }) => {
    test.skip(
      browserName !== 'chromium',
      "WASM doesn't supported in this browser",
    );
    await shouldSuccessRun(page, 'wasm', '2.0.1');
  });
});

async function shouldSuccessRun(
  page: Page,
  platform: keyof typeof OUTPUTS,
  version: string,
) {
  await gotoHtmlWidget(
    page,
    { selector: 'code', version: version },
    /* language=html */ `
      <code data-target-platform='${platform}'>${printlnCode(
        'Hello, world!',
      )}</code>
    `,
  );

  const resolveRun = await mockRunRequest(page);

  const editor = page.locator(WIDGET_SELECTOR);

  await Promise.all([waitRunRequest(page), runButton(editor)]);

  resolveRun({
    json: Object.freeze(OUTPUTS[platform]),
  });

  // playground loaded
  await expect(editor.locator(RESULT_SELECTOR)).toBeVisible();
  await expect(editor.locator(RESULT_SELECTOR)).toContainText('Hello, world!');
}

async function shouldFailedRun(
  page: Page,
  platform: string,
  version: string,
  text: string,
) {
  await gotoHtmlWidget(
    page,
    { selector: 'code', version: version },
    /* language=html */ `
      <code data-target-platform='${platform}'>${printlnCode(
        'Hello, world!',
      )}</code>
    `,
  );

  const editor = page.locator(WIDGET_SELECTOR);
  await runButton(editor);

  await expect(editor.locator(RESULT_SELECTOR)).toBeVisible();
  await expect(
    editor.locator(RESULT_SELECTOR).locator('.test-fail'),
  ).toContainText(text);
}
