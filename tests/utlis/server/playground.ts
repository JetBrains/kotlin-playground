import { Page } from '@playwright/test';

type AddStyleTag = Parameters<Page['addStyleTag']>;
type AddStyleTagOptions = AddStyleTag[0];

type ScriptOptionsKeys = 'version' | 'server' | 'selector';
type ScriptOptions = {
  [key in ScriptOptionsKeys]?: string;
};

type ScritPlaygroundOptions = {
  styles?: AddStyleTagOptions[];
  options?: ScriptOptions;
};

function getOptions(options: ScriptOptions = {}) {
  if (!options.selector) options.selector = 'code';
  return Object.entries(options)
    .map(([key, val]) => `data-${key}="${val}"`)
    .join(' ');
}

export async function gotoScriptWidget(page: Page, html: string): Promise<Page>;
export async function gotoScriptWidget(
  page: Page,
  config: ScritPlaygroundOptions,
  html: string,
): Promise<Page>;
export async function gotoScriptWidget(
  page: Page,
  config: ScritPlaygroundOptions | string,
  html?: string,
): Promise<Page> {
  let content: string = html;
  let opts: ScritPlaygroundOptions;

  if (typeof config === 'string') {
    content = config;
    opts = null;
  } else {
    opts = config;
  }

  const { options } = opts || {};

  await page.goto('/blank.html');

  await page.setContent(`
    <form method="POST" action="/playground.html">
        <input name="script" value="${encodeURIComponent(getOptions(options))}">
        <input name="body" value="${encodeURIComponent(content || '')}">
    </form>
  `);

  const body = await page.evaluateHandle(() => document.body);
  await body.evaluate(() => document.forms[0].submit());

  return page;
}
