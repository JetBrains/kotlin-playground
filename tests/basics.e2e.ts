import { expect, Locator, Page, test } from '@playwright/test';

import { gotoHtmlWidget } from './utlis/server/playground';

import {
  LOADER_SELECTOR,
  OPEN_EDITOR_SELECTOR,
  RESULT_SELECTOR,
  RUN_SELECTOR,
  TARGET_SELECTOR,
  VERSION_SELECTOR,
  WIDGET_SELECTOR,
} from './utlis/selectors';

import {
  closeButton,
  replaceStringInEditor,
  runButton,
} from './utlis/interactions';

import { checkEditorView, checkScreenshot } from './utlis/screenshots';
import { prepareNetwork, printlnCode, RouteFulfill, toPostData } from './utlis';
import { mockRunRequest, waitRunRequest } from './utlis/mocks/compiler';

test.describe('basics', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await prepareNetwork(page, baseURL); // offline mode
  });

  test('highlight only', async ({ page }) => {
    await gotoHtmlWidget(
      page,
      { selector: 'code' },
      `<code data-highlight-only>${printlnCode('Hello, world!')}</code>`,
    );

    const editor = page.locator(WIDGET_SELECTOR);

    await expect(page.locator('code')).not.toBeVisible(); // original node hided
    await expect(editor).toHaveCount(1); // playground loaded
    await expect(editor.locator(OPEN_EDITOR_SELECTOR)).not.toBeVisible(); // open on play-link
    await expect(editor.locator(TARGET_SELECTOR)).not.toBeVisible(); // default target JVN
    await expect(editor.locator(VERSION_SELECTOR)).not.toBeVisible(); // latest version marker
    await expect(editor.locator(RUN_SELECTOR)).not.toBeVisible();

    // Take screen fullpage, for sure original node should be invisible
    await checkScreenshot(page.locator('body'), 'initial view is correct');
  });

  test('simple usage', async ({ page }) => {
    await gotoHtmlWidget(
      page,
      { selector: 'code' },
      `<p>before</p>
        <code>${printlnCode('Hello, world!')}</code>
      <p>after</p>`,
    );

    const editor = page.locator(WIDGET_SELECTOR);
    await expect(editor).toHaveCount(1); // playground loaded
    await expect(page.locator('code')).not.toBeVisible(); // original node hided

    // editor on correct DOM position
    await expect(editor.locator('xpath=preceding-sibling::p[1]')).toHaveText(
      'before',
    );
    await expect(editor.locator('xpath=following-sibling::p[1]')).toHaveText(
      'after',
    );

    await expect(editor.locator(RUN_SELECTOR)).toHaveCount(1); // run button exists
    await expect(editor.locator(OPEN_EDITOR_SELECTOR)).toHaveCount(1); // open on play-link exists
    await expect(editor.locator(TARGET_SELECTOR)).toHaveText('Target: JVM'); // default target JVM
    await expect(editor.locator(VERSION_SELECTOR)).toHaveText(
      'Running on v.1.8.21', // latest version marker
    );

    // Take screen fullpage, for sure original node should be invisible
    await checkScreenshot(page.locator('body'), 'initial view is correct');

    // run with default source
    await checkPrintlnCase(page, editor, 'Hello, world!');

    // click close button
    await closeButton(editor);
    await checkEditorView(editor, 'console closed');

    // Edit and run
    await replaceStringInEditor(page, editor, 'Hello, world!', 'edited');
    await checkPrintlnCase(page, editor, 'edited');
  });

  test('user init widget', async ({ page }) => {
    await gotoHtmlWidget(page, `<code>${printlnCode('Hello, world!')}</code>`);

    const editor = page.locator(WIDGET_SELECTOR);

    // doesn't rendered by default
    await expect(editor).toHaveCount(0);

    //language=javascript
    const content = `(() => {
      const KotlinPlayground = window.KotlinPlayground;
      KotlinPlayground('code');
    })();`;

    await page.addScriptTag({ content });

    // playground loaded
    await expect(editor).toHaveCount(1);
  });
});

function checkPrintlnCase(page: Page, editor: Locator, text: string) {
  const source = toPostData(printlnCode(text));
  const postData = `{"args":"","files":[{"name":"File.kt","text":"${source}","publicId":""}],"confType":"java"}`;

  const serverOutput = {
    json: Object.freeze({
      errors: { 'File.kt': [] },
      exception: null,
      text: `<outStream>${text}\n</outStream>`,
    }),
  };

  return checkRunCase(page, editor, postData, serverOutput);
}

export async function checkRunCase(
  page: Page,
  editor: Locator,
  postData: string,
  serverOutput: RouteFulfill,
) {
  const resolveRun = await mockRunRequest(page);

  const [request] = await Promise.all([
    waitRunRequest(page),
    runButton(editor),
  ]);

  expect(postData).toEqual(request.postData());

  await expect(editor.locator(LOADER_SELECTOR)).toBeVisible();
  // await expectScreenshot(editor, 'run code - loading!');

  resolveRun(serverOutput);

  await expect(editor.locator(RESULT_SELECTOR)).toBeVisible();
  await checkEditorView(editor, 'run code - done!');
}
