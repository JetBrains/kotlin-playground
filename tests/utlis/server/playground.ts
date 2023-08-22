import { expect, Page } from '@playwright/test';

type ScriptOptionsKeys = 'version' | 'server' | 'selector';
type ScriptOptions = {
  [key in ScriptOptionsKeys]?: string;
};
function getOptions(options: ScriptOptions = {}) {
  return Object.entries(options)
    .filter(([, val]) => val)
    .map(([key, val]) => `data-${key}="${val}"`)
    .join(' ');
}

export async function gotoHtmlWidget(page: Page, html: string): Promise<Page>;
export async function gotoHtmlWidget(
  page: Page,
  config: ScriptOptions,
  html: string,
): Promise<Page>;
export async function gotoHtmlWidget(
  page: Page,
  config: ScriptOptions | string,
  html?: string,
): Promise<Page> {
  let content: string = html;
  let options: ScriptOptions;

  if (typeof config === 'string') {
    content = config;
    options = null;
  } else {
    options = config;
  }

  await page.goto('/blank.html');

  await page.setContent(`
    <form method="POST" action="/playground.html">
        <input name="script" value="${encodeURIComponent(
          getOptions(options || {}),
        )}">
        <input name="body" value="${encodeURIComponent(content || '')}">
    </form>
  `);

  const body = await page.evaluateHandle(() => document.body);
  await body.evaluate(() => document.forms[0].submit());

  await expect(page.locator('[data-page="playground"]')).toHaveCount(1);

  return page;
}
