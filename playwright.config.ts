import { env } from 'process';
import { config as dotenv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

dotenv({ path: `.env.local`, override: true });

const isDevMode = Boolean(env.TEST_MODE === 'dev');

function getHeadlessMode() {
    const { TEST_HEADLESS_MODE } = env;
    return TEST_HEADLESS_MODE ? TEST_HEADLESS_MODE === 'true' : !isDevMode;
}

function getProjects() {
  let projects = [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ];

  if (!isDevMode) projects = projects.concat(
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  );

  return projects;
}

export default defineConfig({
    testDir: './tests',
    testMatch: /.*\.e2e\.tsx?$/,

    timeout: 60000,
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
      headless: getHeadlessMode(),
      ignoreHTTPSErrors: true,
      screenshot: {
      fullPage: true,
      mode: isDevMode ? 'only-on-failure' : 'on',
    },

    trace: isDevMode ? 'on-first-retry' : 'on',
        video: isDevMode ? 'on-first-retry' : 'on',
    },

    projects: getProjects(),
});
