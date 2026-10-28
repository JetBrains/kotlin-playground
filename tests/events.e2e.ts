import { expect, Locator, Page, test } from '@playwright/test';

import { prepareNetwork, printlnCode } from './utils';
import { gotoHtmlWidget } from './utils/server/playground';
import { RESULT_SELECTOR, WIDGET_SELECTOR } from './utils/selectors';
import { runButton } from './utils/interactions';
import { mockRunRequest, waitRunRequest } from './utils/mocks/compiler';
import { makeJSPrintCode } from './utils/mocks/wasm/result';

//language=kotlin
const TEST_CODE = `import org.junit.Test
import org.junit.Assert

class TestOutput {
    @Test fun testPassed() {
        println("passed output")
        Assert.assertTrue(true)
    }

    @Test fun testFailed() {
        println("failed output")
        Assert.assertEquals("message", 1, 2)
    }
}`;

const JUNIT_RESULT = Object.freeze({
  errors: { 'File.kt': [] },
  exception: null,
  testResults: {
    TestOutput: [
      {
        methodName: 'testPassed',
        className: 'TestOutput',
        status: 'OK',
        executionTime: 3,
        output: '<outStream>passed output\n</outStream>',
      },
      {
        methodName: 'testFailed',
        className: 'TestOutput',
        status: 'FAIL',
        executionTime: 2,
        output: '<outStream>failed output\n</outStream>',
        comparisonFailure: { message: 'assertion message' },
      },
      {
        methodName: 'testError',
        className: 'TestOutput',
        status: 'ERROR',
        executionTime: 1,
        output: '<errStream>error output\n</errStream>',
        exception: { message: 'exception message' },
      },
    ],
  },
});

const JS_RESULT = Object.freeze({
  jsCode: makeJSPrintCode('Hello, world!'),
  errors: { 'File.kt': [] },
  exception: null,
  text: '',
});

type Calls = Record<string, unknown[][]>;

/**
 * Init widget with event options.
 * `events` is JS source of an object literal; every event records its arguments to `window.calls`.
 */
async function initWidget(page: Page, html: string, events: string) {
  await gotoHtmlWidget(page, html);

  //language=javascript
  const content = `(() => {
    const calls = window.calls = {};
    const record = (name, fn) => function (...args) {
      (calls[name] = calls[name] || []).push(JSON.parse(JSON.stringify(args)));
      return fn ? fn.apply(this, args) : undefined;
    };
    const events = ${events};
    const options = {};
    for (const name of Object.keys(events)) options[name] = record(name, events[name]);
    for (const name of ['onTestPassed', 'onTestFailed', 'onError', 'getJsCode', 'onTestResult', 'onCompileResult', 'onRequest'])
      if (!options[name]) options[name] = record(name);
    window.KotlinPlayground('code', options);
  })();`;

  await page.addScriptTag({ content });

  const editor = page.locator(WIDGET_SELECTOR);
  await expect(editor).toHaveCount(1);
  return editor;
}

type TestWindow = Window & { calls: Calls; failed: number };

function getCalls(page: Page): Promise<Calls> {
  return page.evaluate(() => (window as unknown as TestWindow).calls);
}

async function run(page: Page, editor: Locator, json: object) {
  const resolveRun = await mockRunRequest(page);
  const [request] = await Promise.all([
    waitRunRequest(page),
    runButton(editor),
  ]);
  resolveRun({ json });

  const result = editor.locator(RESULT_SELECTOR);
  await expect(result).toBeVisible();
  return { request, result };
}

const junitHtml = `<code data-target-platform="junit">${TEST_CODE}</code>`;

test.describe('events', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await prepareNetwork(page, baseURL); // offline mode
  });

  test('onTestFailed receives typed report', async ({ page }) => {
    const editor = await initWidget(page, junitHtml, '{}');
    const { result } = await run(page, editor, JUNIT_RESULT);

    await expect(result.locator('.test-fail')).toHaveText(
      'Fail: testFailed: assertion message',
    );

    const calls = await getCalls(page);
    expect(calls.onTestPassed).toBeUndefined();
    expect(calls.onTestResult).toHaveLength(1);
    expect(calls.onCompileResult).toHaveLength(1);
    expect(calls.onTestFailed).toHaveLength(1);

    const [report, ctx] = calls.onTestFailed[0];
    expect(ctx).toEqual({
      platform: 'junit',
      compilerVersion: '1.9.20',
      code: TEST_CODE,
    });
    expect(report).toEqual({
      cases: [
        {
          className: 'TestOutput',
          methodName: 'testPassed',
          status: 'OK',
          durationMs: 3,
          output: [{ stream: 'out', text: 'passed output\n' }],
        },
        {
          className: 'TestOutput',
          methodName: 'testFailed',
          status: 'FAIL',
          durationMs: 2,
          output: [{ stream: 'out', text: 'failed output\n' }],
          failure: { message: 'assertion message' },
        },
        {
          className: 'TestOutput',
          methodName: 'testError',
          status: 'ERROR',
          durationMs: 1,
          output: [{ stream: 'err', text: 'error output\n' }],
          exception: { message: 'exception message' },
        },
      ],
    });
  });

  test('onTestResult modifies results before render and callbacks', async ({
    page,
  }) => {
    //language=javascript
    const events = `{
      onTestResult(report) {
        report.cases.forEach((test) => { test.status = 'OK'; });
      },
    }`;
    const editor = await initWidget(page, junitHtml, events);
    const { result } = await run(page, editor, JUNIT_RESULT);

    await expect(result.locator('.test-passed')).toHaveCount(3);
    await expect(result.locator('.test-fail')).toHaveCount(0);

    const calls = await getCalls(page);
    expect(calls.onTestFailed).toBeUndefined();
    expect(calls.onTestPassed).toHaveLength(1);
    const [report] = calls.onTestPassed[0] as [{ cases: { status: string }[] }];
    expect(report.cases.map((test) => test.status)).toEqual(['OK', 'OK', 'OK']);
  });

  test('onTestResult invalid mutation fails the run', async ({ page }) => {
    //language=javascript
    const events = `{
      onTestResult(report) { report.cases[0].status = 'ok'; },
    }`;
    const editor = await initWidget(page, junitHtml, events);
    const { result } = await run(page, editor, JUNIT_RESULT);

    await expect(result).toContainText(
      'onTestResult produced an invalid TestReport',
    );

    const calls = await getCalls(page);
    expect(calls.onTestPassed).toBeUndefined();
    expect(calls.onTestFailed).toBeUndefined();
    expect(calls.onError).toHaveLength(1);
  });

  test('onCompileResult error skips tests', async ({ page }) => {
    //language=javascript
    const events = `{
      onCompileResult(result) {
        return { ...result, diagnostics: [{ severity: 'ERROR', message: 'custom compile error' }] };
      },
    }`;
    const editor = await initWidget(page, junitHtml, events);
    const { result } = await run(page, editor, JUNIT_RESULT);

    await expect(result).toContainText('custom compile error');

    const calls = await getCalls(page);
    expect(calls.onTestResult).toBeUndefined();
    expect(calls.onTestPassed).toBeUndefined();
    expect(calls.onTestFailed).toBeUndefined();
    expect(calls.onError).toHaveLength(1);
  });

  test('onCompileResult exception is shown in console', async ({ page }) => {
    //language=javascript
    const events = `{
      onCompileResult() { throw new Error('broken event'); },
    }`;
    const editor = await initWidget(page, junitHtml, events);
    const { result } = await run(page, editor, JUNIT_RESULT);

    await expect(result).toContainText('broken event');
    expect((await getCalls(page)).onError).toHaveLength(1);
  });

  for (const kind of ['sync', 'async']) {
    test(`onRequest mutates request without return (${kind})`, async ({
      page,
    }) => {
      //language=javascript
      const events = `{
        ${kind === 'async' ? 'async ' : ''}onRequest(request) {
          request.headers['X-Token'] = 'secret';
          if (request.body) request.body.files[0].text += '\\n// patched';
        },
      }`;
      const code = printlnCode('Hello');
      const editor = await initWidget(page, `<code>${code}</code>`, events);
      const { request } = await run(page, editor, {
        errors: { 'File.kt': [] },
        exception: null,
        text: '<outStream>Hello\n</outStream>',
      });

      expect(request.method()).toBe('POST');
      expect(request.headers()['x-token']).toBe('secret');
      expect(JSON.parse(request.postData())).toEqual({
        args: '',
        files: [{ name: 'File.kt', text: code + '\n// patched', publicId: '' }],
        confType: 'java',
      });

      const calls = await getCalls(page);
      const types = calls.onRequest.map(
        ([req]) => (req as { type: string }).type,
      );
      expect(types).toEqual(['versions', 'compile']);
    });
  }

  for (const value of ["'oops'", '{}']) {
    test(`onRequest malformed result ${value} fails the run`, async ({
      page,
    }) => {
      //language=javascript
      const events = `{
        onRequest(request) { return request.type === 'compile' ? ${value} : undefined; },
      }`;
      const editor = await initWidget(
        page,
        `<code>${printlnCode('Hello')}</code>`,
        events,
      );

      let sent = false;
      page.on('request', (req) => {
        if (req.method() === 'POST') sent = true;
      });

      await runButton(editor);
      const result = editor.locator(RESULT_SELECTOR);
      await expect(result).toContainText(
        'onRequest must return ApiRequest or undefined',
      );
      expect(sent).toBe(false);
      expect((await getCalls(page)).onError).toHaveLength(1);
    });
  }

  test('onCompileResult replaces jsCode', async ({ page }) => {
    //language=javascript
    const events = `{
      onCompileResult(result) {
        result.jsCode = result.jsCode.replace('Hello, world!', 'Hello, events!');
      },
    }`;
    const editor = await initWidget(
      page,
      `<code data-target-platform="js">${printlnCode('Hello, world!')}</code>`,
      events,
    );
    const { result } = await run(page, editor, JS_RESULT);

    await expect(result).toContainText('Hello, events!');
    const calls = await getCalls(page);
    expect(calls.getJsCode[0][0]).toContain('Hello, events!');
  });

  test('highlight does not trigger result events', async ({ page }) => {
    let highlights = 0;
    await page.route(
      (url) => url.pathname.endsWith('/compiler/highlight'),
      (route) => {
        highlights++;
        return route.fulfill({ json: { 'File.kt': [] } });
      },
    );

    const editor = await initWidget(
      page,
      `<code highlight-on-fly="true">${printlnCode('Hello')}</code>`,
      '{}',
    );

    await editor.locator('.CodeMirror-line').first().click();
    await page.keyboard.type(' ');
    await expect.poll(() => highlights).toBeGreaterThan(0);

    const calls = await getCalls(page);
    expect(calls.onCompileResult).toBeUndefined();
    expect(calls.onTestResult).toBeUndefined();
    expect(
      calls.onRequest.map(([req]) => (req as { type: string }).type),
    ).toContain('highlight');
  });

  test('legacy callbacks without arguments still work', async ({ page }) => {
    await gotoHtmlWidget(page, junitHtml);
    //language=javascript
    await page.addScriptTag({
      content: `window.failed = 0;
        window.KotlinPlayground('code', { onTestFailed: function () { window.failed++; } });`,
    });

    const editor = page.locator(WIDGET_SELECTOR);
    await expect(editor).toHaveCount(1);
    await run(page, editor, JUNIT_RESULT);

    await expect
      .poll(() => page.evaluate(() => (window as unknown as TestWindow).failed))
      .toBe(1);
  });
});

test.describe('output streams', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await prepareNetwork(page, baseURL); // offline mode
  });

  test('JVM output is escaped per stream', async ({ page }) => {
    const editor = await initWidget(
      page,
      `<code>${printlnCode('Hello')}</code>`,
      '{}',
    );
    const { result } = await run(page, editor, {
      errors: { 'File.kt': [] },
      exception: null,
      text: '<outStream>a <b>bold</b> &amp; c\n</outStream><errStream>err line\n</errStream><errStream>BUG</errStream>',
    });

    const out = result.locator('.standard-output');
    await expect(out).toHaveText('a <b>bold</b> &amp; c');
    await expect(out.locator('b')).toHaveCount(0);

    const err = result.locator('.error-output');
    await expect(err).toHaveCount(2);
    await expect(err.first()).toHaveText('err line');
    await expect(err.last()).toContainText('It seems you just found a bug!');
    await expect(err.last().locator('a')).toHaveAttribute(
      'href',
      'http://kotl.in/issue',
    );
  });
});
