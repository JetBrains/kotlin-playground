import { env } from 'process';
import { config as dotenv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

dotenv({ path: `.env.local`, override: true });

const PROJECTS_LIST = {
  DEV: ['Desktop Chrome'],
  GITHUB_MAC: ['Desktop Safari'],
  GITHUB_LINUX: ['Desktop Chrome', 'Desktop Firefox'],
};

const mode = (env.TEST_PROJECT_LIST || 'DEV').toUpperCase();

if (!(mode && isKeyOfObject(mode, PROJECTS_LIST))) {
  const list = Object.keys(PROJECTS_LIST)
    .map((s) => `'${s.toLowerCase()}'`)
    .join(' or ');

  throw Error(`TEST_PROJECT_LIST should be ${list}`);
}

const isDevMode = Boolean(mode === 'DEV');

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.e2e\.tsx?$/,
  snapshotPathTemplate: `{testDir}/{testFileDir}/__screenshots__/${mode.toLowerCase()}/{projectName}/{testFilePath}-{arg}{ext}`,

  timeout: 30000,
  forbidOnly: !isDevMode,
  reporter: 'list',
  retries: isDevMode ? 0 : 2,
  fullyParallel: !isDevMode,

  webServer: {
    command: 'npm run test:server',
    port: 8000,
    reuseExistingServer: isDevMode,
  },

  use: {
    testIdAttribute: 'data-test',
    headless: ((value) => (value ? value === 'true' : !isDevMode))(
      env.TEST_HEADLESS_MODE,
    ),
    ignoreHTTPSErrors: true,
    screenshot: {
      fullPage: true,
      mode: isDevMode ? 'only-on-failure' : 'on',
    },
    trace: isDevMode ? 'on-first-retry' : 'on',
    video: isDevMode ? 'on-first-retry' : 'on',
  },

  projects: PROJECTS_LIST[mode].map((project) => ({
    name: project,
    use: { ...devices[project] },
  })),
});

export function isKeyOfObject<T extends object>(
  key: string | number | symbol,
  obj: T,
): key is keyof T {
  return key in obj;
}
