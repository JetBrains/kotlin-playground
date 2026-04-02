import { expect, test } from '@playwright/test';
import { join } from 'path';

import { prepareNetwork, printlnCode } from './utils';
import { gotoHtmlWidget } from './utils/server/playground';
import { mockRunRequest, waitRunRequest } from './utils/mocks/compiler';
import { runButton } from './utils/interactions';
import { RESULT_SELECTOR, WIDGET_SELECTOR } from './utils/selectors';

test.describe('Test interceptors', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await prepareNetwork(page, baseURL);
  });

  test('async onRequest adds Authorization header to run request', async ({
    page,
  }) => {
    await gotoHtmlWidget(page, `<code>${printlnCode('Hello')}</code>`);

    const editor = page.locator(WIDGET_SELECTOR);
    await expect(editor).toHaveCount(0);

    //language=javascript
    await page.addScriptTag({
      content: `(() => {
        const KotlinPlayground = window.KotlinPlayground;
        KotlinPlayground('code', {
          onRequest: async (url, options) => {
            return {
              ...options,
              headers: {
                ...options.headers,
                'Authorization': 'Bearer test-token',
              },
            };
          },
        });
      })();`,
    });

    await expect(editor).toHaveCount(1);

    const resolveRun = await mockRunRequest(page);

    const [request] = await Promise.all([
      waitRunRequest(page),
      runButton(editor),
    ]);

    expect(request.headers()['authorization']).toBe('Bearer test-token');

    resolveRun({
      json: {
        errors: { 'File.kt': [] },
        exception: null,
        text: '<outStream>Hello\n</outStream>',
      },
    });

    await expect(editor.locator(RESULT_SELECTOR)).toBeVisible();
  });

  test('onRequest is applied to versions request', async ({
    page,
    baseURL,
  }) => {
    let versionsRequestHeaders: Record<string, string> = {};

    await prepareNetwork(page, baseURL, {
      versions: (route, req) => {
        versionsRequestHeaders = req.headers();
        route.fulfill({ path: join(__dirname, 'utils/mocks/versions.json') });
      },
    });

    await gotoHtmlWidget(page, `<code>${printlnCode('Hello')}</code>`);

    //language=javascript
    await page.addScriptTag({
      content: `(() => {
        const KotlinPlayground = window.KotlinPlayground;
        KotlinPlayground('code', {
          onRequest: async (url, options) => ({
            ...options,
            headers: { ...options.headers, 'Authorization': 'Bearer test-token' },
          }),
        });
      })();`,
    });

    await expect(page.locator(WIDGET_SELECTOR)).toHaveCount(1);

    expect(versionsRequestHeaders['authorization']).toBe('Bearer test-token');
  });

  test('onRequest receives url string and fetchOptions with method and headers', async ({
    page,
  }) => {
    await gotoHtmlWidget(page, `<code>${printlnCode('Hello')}</code>`);

    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    let capturedContentType: string | undefined;

    await page.exposeFunction(
      'captureOnRequestArgs',
      (url: string, method: string, contentType: string) => {
        capturedUrl = url;
        capturedMethod = method;
        capturedContentType = contentType;
      },
    );

    //language=javascript
    await page.addScriptTag({
      content: `(() => {
        const KotlinPlayground = window.KotlinPlayground;
        KotlinPlayground('code', {
          onRequest: async (url, options) => {
            if (options.method === 'POST') {
              await window.captureOnRequestArgs(url, options.method, options.headers['Content-Type']);
            }
            return options;
          },
        });
      })();`,
    });

    const editor = page.locator(WIDGET_SELECTOR);
    await expect(editor).toHaveCount(1);

    const resolveRun = await mockRunRequest(page);

    await Promise.all([waitRunRequest(page), runButton(editor)]);

    expect(capturedUrl).toMatch(/\/api\/[\d.]+(-[a-z]+\.\d+)?\/compiler\/run$/);
    expect(capturedMethod).toBe('POST');
    expect(capturedContentType).toBe('application/json; charset=utf-8');

    resolveRun({
      json: {
        errors: { 'File.kt': [] },
        exception: null,
        text: '<outStream>Hello\n</outStream>',
      },
    });
  });
});
