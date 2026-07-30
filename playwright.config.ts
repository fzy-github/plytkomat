import { defineConfig } from '@playwright/test'

// Smoke E2E (opcjonalny): wymaga zbudowanej aplikacji (npm run build) oraz
// przeglądarki Playwright (npx playwright install chromium) albo ścieżki
// istniejącego Chromium w PLAYWRIGHT_CHROMIUM_PATH.
export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
})
