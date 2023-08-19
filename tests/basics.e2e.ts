import {expect, test} from '@playwright/test';
import {mockVersions} from "./utlis/mocks/versions";
import {gotoScriptWidget} from "./utlis/server/playground";

test.describe('Basics', () => {
  test.beforeEach(async ({ context }) => {
    await mockVersions(context);
  });

  test('initial', async ({page}) => {
    await gotoScriptWidget(page, `<code>
fun main() {
  println(cat.name)
    }
    </code>`);

    await expect(page).toHaveScreenshot();
  });
});
