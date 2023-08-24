import { expect, Locator } from '@playwright/test';

export async function checkEditorView(node: Locator, message: string) {
  const cursor = node.locator('.CodeMirror-cursors');

  // Cursor blinks all the time, it's failed test from time to time
  await cursor.evaluate((element) => (element.style.display = 'none'));
  await expect(node, message).toHaveScreenshot();
  await cursor.evaluate((element) => (element.style.display = null));
}
