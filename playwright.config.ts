import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3317',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'env DATABASE_URL= BETTER_AUTH_SECRET= BETTER_AUTH_URL= TASKFLOW_GOOGLE_CLIENT_ID= TASKFLOW_GOOGLE_CLIENT_SECRET= TASKFLOW_ALLOWED_EMAIL= GOOGLE_GENERATIVE_AI_API_KEY= GEMINI_API_KEY= GOOGLE_API_KEY= TASKFLOW_LOCAL_AUTH=true npm run dev -- --port 3317',
    url: 'http://127.0.0.1:3317',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
