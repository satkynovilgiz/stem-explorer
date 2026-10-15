import { defineConfig } from '@playwright/test'

/**
 * Browser tests run against the production build (`vite preview`), the same bundle Vercel serves.
 * They use the locally installed Google Chrome (`channel: 'chrome'`), so no browser download is
 * needed. SwiftShader gives headless Chrome a software WebGL implementation.
 */
const PORT = 4173
const WEBGL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: 'chrome',
    launchOptions: { args: WEBGL_ARGS },
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
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
