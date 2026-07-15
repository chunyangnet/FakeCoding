import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:8791',
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'python -m agent_nonsense --web --no-browser --quiet --port 8791 --delay 0.03 --character-delay 0',
    cwd: '..',
    url: 'http://127.0.0.1:8791/health',
    reuseExistingServer: false,
    timeout: 20_000,
  },
})
