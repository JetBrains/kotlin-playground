import { expect, Page } from '@playwright/test';

export async function expectScreenshot(page: Page, message: string) {
  const cursor = page.locator('.CodeMirror-cursors');

  // Cursor blinks all the time, it's failed test from time to time
  await cursor.evaluate((element) => (element.style.display = 'none'));
  await expect(page, message).toHaveScreenshot();
  await cursor.evaluate((element) => (element.style.display = null));
}
