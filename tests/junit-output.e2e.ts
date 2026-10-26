import { expect, Locator, Page, test } from '@playwright/test';

import { prepareNetwork } from './utils';
import { gotoHtmlWidget } from './utils/server/playground';
import { RESULT_SELECTOR, WIDGET_SELECTOR } from './utils/selectors';
import { runButton } from './utils/interactions';
import { mockRunRequest, waitRunRequest } from './utils/mocks/compiler';

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
        output: '<outStream>error output\n</outStream>',
        exception: { message: 'exception message' },
      },
    ],
  },
});

test.describe('junit output', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await prepareNetwork(page, baseURL); // offline mode
  });

  test('hidden by default', async ({ page }) => {
    const result = await runJUnit(page, '');

    await expect(result.locator('.test-passed')).toHaveText(
      'Passed: testPassed',
    );
    await expect(result.locator('.test-output')).toHaveCount(0);
    await expect(result).not.toContainText('passed output');
  });

  test('shown for passed and failed tests', async ({ page }) => {
    const result = await runJUnit(page, 'data-junit-output="true"');

    const passed = result.locator('.test-passed');
    await expect(passed).toContainText('Passed: testPassed');
    await expectTestOutput(passed, 'passed output');

    const failed = result.locator('.test-fail');
    await expect(failed).toContainText('Fail: testFailed: assertion message');
    await expectTestOutput(failed, 'failed output');

    const error = result.locator('.test-error');
    await expect(error).toContainText('Error: testError: exception message');
    await expect(error.locator('.test-output')).toHaveCount(0);
    await expect(result).not.toContainText('error output');

    await expect(result.locator('.test-output')).toHaveCount(2);
  });
});

async function expectTestOutput(status: Locator, text: string) {
  await expect(status.locator('.test-output')).toHaveText(
    new RegExp(`^Output: ${text}\\s*$`),
  );

  // same color as the status line
  const [statusColor, outputColor] = await Promise.all([
    status.evaluate((el) => getComputedStyle(el).color),
    status
      .locator('.test-output .standard-output')
      .evaluate((el) => getComputedStyle(el).color),
  ]);
  expect(outputColor).toBe(statusColor);
}

async function runJUnit(page: Page, attributes: string): Promise<Locator> {
  await gotoHtmlWidget(
    page,
    { selector: 'code' },
    /* language=html */ `
      <code data-target-platform="junit" ${attributes}>${TEST_CODE}</code>
    `,
  );

  const resolveRun = await mockRunRequest(page);
  const editor = page.locator(WIDGET_SELECTOR);

  await Promise.all([waitRunRequest(page), runButton(editor)]);
  resolveRun({ json: JUNIT_RESULT });

  const result = editor.locator(RESULT_SELECTOR);
  await expect(result).toBeVisible();
  return result;
}
