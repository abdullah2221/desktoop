import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  reporter: 'line',
  use: {
    trace: 'on-first-retry',
  },
});
