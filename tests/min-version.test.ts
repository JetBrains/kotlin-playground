import { expect, test } from '@playwright/test';
import { gotoHtmlWidget } from './utlis/server/playground';
import { prepareNetwork, printlnCode } from './utlis';
import { mockRunRequest, waitRunRequest } from './utlis/mocks/compiler';
import { runButton } from './utlis/interactions';
import {
  LOADER_SELECTOR,
  RESULT_SELECTOR,
  VERSION_SELECTOR,
  WIDGET_SELECTOR,
} from './utlis/selectors';

test.describe('Minimum compiler version', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await prepareNetwork(page, baseURL); // offline mode
  });

  test('with future release', async ({ page }) => {
    await gotoHtmlWidget(
      page,
      { selector: 'code' },
      /* language=html */ `
        <code data-min-compiler-version='2.0.0'>${printlnCode(
          'Hello, world!',
        )}</code>
      `,
    );

    const editor = page.locator(WIDGET_SELECTOR);
    await expect(editor).toHaveCount(1); // playground loaded
    await expect(page.locator('code')).not.toBeVisible(); // original node hided
    await expect(editor.locator(VERSION_SELECTOR)).toHaveText(
      'Running on v.2.0.0-alpha.3', // latest version marker
    );

    const resolveRun = await mockRunRequest(page);

    const [request] = await Promise.all([
      waitRunRequest(page),
      runButton(editor),
    ]);

    expect(request.url()).toContain('2.0.0-alpha.3');

    await expect(editor.locator(LOADER_SELECTOR)).toBeVisible();

    resolveRun({
      json: Object.freeze({
        errors: { 'File.kt': [] },
        exception: null,
        text: '<outStream>run code - done!\n</outStream>',
      }),
    });

    await expect(editor.locator(RESULT_SELECTOR)).toBeVisible();
  });
});
