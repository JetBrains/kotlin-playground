import { expect, Locator, Page, test } from '@playwright/test';

import { gotoScriptWidget } from './utlis/server/playground';

import {
  LOADER_SELECTOR, OPEN_EDITOR_SELECTOR,
  RESULT_SELECTOR, RUN_SELECTOR, TARGET_SELECTOR, VERSION_SELECTOR,
  WIDGET_SELECTOR,
} from './utlis/selectors';

import {
  closeButton,
  replaceStringInEditor,
  runButton,
} from './utlis/interactions';

import { expectScreenshot } from './utlis/expects';
import { prepareNetwork, RouteFulfill, toPostData } from './utlis';
import { mockRunRequest, waitRunRequest } from './utlis/mocks/compiler';

test.describe('basics', () => {
  let unMockNetwork: CallableFunction;

  test.beforeEach(async ({ context, baseURL }) => {
    unMockNetwork = await prepareNetwork(context, baseURL); // offline mode
  });

  test.afterEach(async () => {
    if (unMockNetwork) await unMockNetwork();
  });

  test('simple usage', async ({ page }) => {
    await gotoScriptWidget(page, `<code>${tplCode('Hello, world!')}</code>`);

    const editor = page.locator(WIDGET_SELECTOR);

    await expect(editor).toHaveCount(1); // playground loaded
    await expect(editor.locator(OPEN_EDITOR_SELECTOR)).toHaveCount(1); // open on play-link exists
    await expect(editor.locator(TARGET_SELECTOR)).toHaveText('Target: JVM'); // default target JVN
    await expect(editor.locator(VERSION_SELECTOR)).toHaveText('Running on v.1.8.21'); // latest version marker
    await expect(editor.locator(RUN_SELECTOR)).toHaveCount(1); // run button exists
    await expectScreenshot(page, 'initial view is correct');

    // run with default source
    await checkPrintlnCase(page, editor, 'Hello, world!');

    // click close button
    await closeButton(editor);
    await expectScreenshot(page, 'console closed');

    // Edit and run
    await replaceStringInEditor(page, editor, 'Hello, world!', 'edited');
    await checkPrintlnCase(page, editor, 'edited');
  });
});

function checkPrintlnCase(page: Page, editor: Locator, text: string) {
  const source = toPostData(tplCode(text));
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
  node: Locator,
  postData: string,
  serverOutput: RouteFulfill,
) {
  const resolveRun = await mockRunRequest(page);

  const [request] = await Promise.all([waitRunRequest(page), runButton(node)]);

  expect(postData).toEqual(request.postData());

  await expect(node.locator(LOADER_SELECTOR)).toBeVisible();
  // await expectScreenshot(page, 'run code - loading!');

  resolveRun(serverOutput);

  await expect(node.locator(RESULT_SELECTOR)).toBeVisible();
  await expectScreenshot(page, 'run code - done!');
}

function tplCode(text: string) {
  //language=kotlin
  return `fun main() {
    println("${text}")
  }`;
}
