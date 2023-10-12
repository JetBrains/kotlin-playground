import { expect, Locator } from '@playwright/test';
import { WIDGET_WRAPPER_SELECTOR } from './selectors';

export async function hideCursor(node: Locator, callback: () => Promise<void>) {
  const cursor = node.locator('.CodeMirror-cursors');
  // Cursor blinks all the time, it's failed test from time to time
  await cursor.evaluate((element) => (element.style.display = 'none'));
  await callback();
  await cursor.evaluate((element) => (element.style.display = null));
}

export function checkScreenshot(node: Locator, message: string) {
  return hideCursor(node, () => expect(node, message).toHaveScreenshot());
}

export function checkEditorView(editor: Locator, message: string) {
  return hideCursor(editor, async () => {
    /* Add top/bottom margins for wrapper node */
    const [boundingBox, margins] = await Promise.all([
      editor.boundingBox(),
      editor.locator(`> ${WIDGET_WRAPPER_SELECTOR}`).evaluate((el) => ({
        top: parseFloat(
          window.getComputedStyle(el).getPropertyValue('margin-top'),
        ),
        bottom: parseFloat(
          window.getComputedStyle(el).getPropertyValue('margin-bottom'),
        ),
      })),
    ]);

    const clip = {
      ...boundingBox,
      y: boundingBox.y - margins.top,
      height: boundingBox.height + margins.bottom,
    };

    await expect(editor.page(), message).toHaveScreenshot({ clip });
  });
}
