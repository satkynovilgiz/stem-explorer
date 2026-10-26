import { defineConfig } from '@playwright/test'

/**
 * Browser tests run against the production build (`vite preview`), the same bundle Vercel serves.
 * They use the locally installed Google Chrome (`channel: 'chrome'`), so no browser download is
 * needed. SwiftShader gives headless Chrome a software WebGL implementation.
 *
 * Set BASE_URL to test an already-deployed site instead (CI does this after each production
 * deployment); no local server is started then.
 */
const PORT = 4173
const BASE_URL = process.env.BASE_URL
const CI = !!process.env.CI
const WEBGL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL ?? `http://127.0.0.1:${PORT}`,
    channel: 'chrome',
    launchOptions: { args: WEBGL_ARGS },
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  webServer: BASE_URL
    ? undefined
    : {
        command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'desktop',
      testIgnore: ['**/mobile.e2e.ts', '**/no-webgl.e2e.ts'],
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      testMatch: '**/mobile.e2e.ts',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'no-webgl',
      testMatch: '**/no-webgl.e2e.ts',
      use: { viewport: { width: 1440, height: 900 }, launchOptions: { args: ['--disable-3d-apis'] } },
    },
  ],
})
