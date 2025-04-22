import { BrowserContext, expect, Locator, Page, Route } from '@playwright/test';

import { mockRunRequest, mockVersions, waitRunRequest } from './mocks/compiler';
import { LOADER_SELECTOR, RESULT_SELECTOR } from './selectors';
import { runButton } from './interactions';
import { checkEditorView } from './screenshots';

export type RouteFulfill = Parameters<Route['fulfill']>[0];

export async function refuseExternalUrls(
  page: Page | BrowserContext,
  baseURL: string,
) {
  const host = new URL(baseURL).host;

  const checkUrl = (url: URL) => url.host && url.host !== host;
  const onMatch = (route: Route) => route.abort('connectionrefused');

  await page.route(checkUrl, onMatch);
  return () => page.unroute(checkUrl, onMatch);
}

export async function prepareNetwork(
  page: Page | BrowserContext,
  baseURL: string,
  options?: {
    versions: Parameters<typeof mockVersions>[1];
  },
) {
  const unRefuse = await refuseExternalUrls(page, baseURL);
  const unVersions = await mockVersions(page, options?.versions);

  return async () => {
    await unVersions();
    await unRefuse();
  };
}

export function toPostData(code: string) {
  return code.replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

export function printlnCode(text: string) {
  //language=kotlin
  return `fun main() {
    println("${text}")
  }`;
}

export function toHtmlAttributes(
  options: Record<string, string | boolean | number | void>,
) {
  return Object.entries(options)
    .filter(([, val]) => val)
    .map(([key, val]) => `${key}${typeof val === 'string' ? '=' + val : ''}`)
    .join(' ');
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
