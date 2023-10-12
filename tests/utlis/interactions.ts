import { expect, Locator, Page } from '@playwright/test';

import {
  RUN_SELECTOR,
  CLOSE_SELECTOR,
  OUTPUT_SELECTOR,
  editorString,
} from './selectors';

export async function putSelection(page: Page, length: number, value: string) {
  await setSelection(page, length);
  await page.keyboard.type(value);
}

export async function setSelection(page: Page, length: number) {
  await page.keyboard.down('Shift');
  for (let i = 0; i < length; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.up('Shift');
}

export async function runButton(code: Locator) {
  await code.locator(RUN_SELECTOR).click();

  await expect(code.locator(OUTPUT_SELECTOR)).toBeVisible();
}

export async function closeButton(code: Locator) {
  await code.locator(CLOSE_SELECTOR).click();

  await expect(code.locator(OUTPUT_SELECTOR)).toHaveCount(0);
}

export async function replaceStringInEditor(
  page: Page,
  code: Locator,
  oldValue: string,
  newValue: string,
) {
  const bounding = await code.locator(editorString(oldValue)).boundingBox();

  await page.mouse.click(bounding.x + 1, bounding.y + 1, { button: 'left' });
  await putSelection(page, oldValue.length + 2, `"${newValue}"`);
}
