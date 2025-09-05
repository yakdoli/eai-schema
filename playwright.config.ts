import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 설정 파일
 * E2E 테스트를 위한 브라우저 테스트 환경 구성
 */
export default defineConfig({
  testDir: './src/__tests__/e2e',
  /* 병렬 실행 설정 */
  fullyParallel: true,
  /* CI에서 실패 시 재시도 금지 */
  forbidOnly: !!process.env.CI,
  /* CI에서 재시도 설정 */
  retries: process.env.CI ? 2 : 0,
  /* 병렬 워커 수 */
  workers: process.env.CI ? 1 : undefined,
  /* 리포터 설정 */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }]
  ],
  /* 공통 테스트 설정 */
  use: {
    /* 실패 시 스크린샷 */
    screenshot: 'only-on-failure',
    /* 실패 시 비디오 */
    video: 'retain-on-failure',
    /* 추적 정보 */
    trace: 'on-first-retry',
    /* 기본 베이스 URL */
    baseURL: 'http://localhost:3000',
  },

  /* 다양한 브라우저 환경에서 테스트 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* 모바일 테스트 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* 테스트 서버 설정 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2분
  },
});