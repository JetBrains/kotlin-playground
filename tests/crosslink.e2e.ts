import { expect, Page, test } from '@playwright/test';
import { gotoHtmlWidget } from './utlis/server/playground';
import { prepareNetwork, printlnCode, toHtmlAttributes } from './utlis';
import { OPEN_EDITOR_SELECTOR, WIDGET_SELECTOR } from './utlis/selectors';
import { checkEditorView } from './utlis/screenshots';

test.describe('open in playground', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await prepareNetwork(page, baseURL); // offline mode
  });

  test('default @external', async ({ page }) => {
    const code = printlnCode('Hello, world!');
    await gotoHtmlWidget(page, { selector: 'code' }, `<code>${code}</code>`);
    const editor = page.locator(WIDGET_SELECTOR);

    const link = editor.locator(OPEN_EDITOR_SELECTOR).locator('a[href]');

    const url =
      'https://play.kotlinlang.org/editor/v1/N4Igxg9gJgpiBcIBmBXAdgAgLYEMCWaAFAJQbAA6mG1ADgE4EAuANkeSABIzPMQA0GAO4Q6zKAEJ2xStQC%2BIPiEY46AcxiMACsxyMkIrAhAArHADccC8BCw08zGHQBqjgM54IaIwEYAdAA5fACZvEFkgA%3D%3D%3D';

    await Promise.all([
      expect(link).toHaveCount(1),
      expect(link).toHaveText('Open in Playground →'),
      expect(link).toHaveAttribute('target', '_blank'),
      expect(link).toHaveAttribute('rel', 'noopener noreferrer'),
      expect(link).toHaveAttribute('href', url),
    ]);

    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'), // open new page with target blank
      link.first().click(),
    ]);

    expect(newPage.url()).toEqual(url); // new page with correct url

    // wait until final page with editor
    await newPage.waitForNavigation({
      url: (url) => url.toString().startsWith('https://play.kotlinlang.org/#'),
    });

    // check it exists on page
    await expect(newPage.locator('body')).toContainText(code);

    await newPage.close();
  });

  test('with crosslink defined', ({ page }) =>
    checkCrosslink(
      page,
      { 'data-crosslink': 'disabled' },
      printlnCode('Hello, World'),
    ));

  test('no link for js-libs', ({ page }) => {
    test.fixme(
      true,
      "Test doesn't work, BUG in code! jsLibs.length -> jsLibs.size",
    );

    return checkCrosslink(
      page,
      {
        'data-target-platform': 'js',
        'data-js-libs': 'https://somescript.js',
      },
      printlnCode('Hello, World!'),
    );
  });

  test('no link for hidden deps', ({ page }) =>
    checkCrosslink(
      page,
      {},
      `${printlnCode('Hello, World!')}
        <textarea class="hidden-dependency">
          class Cat(val name: String)
        </textarea>`,
    ));

  test('no link for highlight only', ({ page }) =>
    checkCrosslink(
      page,
      { 'data-highlight-only': true },
      printlnCode('Hello, World!'),
      false, // hidden crosslink=enabled too
    ));
});

async function checkCrosslink(
  page: Page,
  options: Record<string, string | boolean>,
  code: string,
  existWhenEnabled: boolean = true,
) {
  // ===== check original case =====
  await checkCrosslinkStatus(page, options, code);
  // ===== check case with data-crosslink=enabled mode =====
  const enabledOptions = { ...options, 'data-crosslink': 'enabled' };
  await checkCrosslinkStatus(page, enabledOptions, code, existWhenEnabled);
}

async function checkCrosslinkStatus(
  page: Page,
  options: Record<string, string | boolean>,
  code: string,
  exists: boolean = false,
) {
  await gotoHtmlWidget(
    page,
    { selector: 'code' },
    `<code ${toHtmlAttributes(options)}>${code}</code>`,
  );

  const editor = page.locator(WIDGET_SELECTOR);

  await expect(editor).toHaveCount(1);
  await expect(editor.locator(OPEN_EDITOR_SELECTOR)).toHaveCount(
    exists ? 1 : 0,
  );

  if (options['data-crosslink'] === 'disabled')
    await checkEditorView(editor, 'hided crosslink');
}
