import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against a production build, using the mock providers (no credits spent).
// Needs local Supabase running: `supabase start`.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "pnpm build && pnpm start -p 3100",
    url: "http://localhost:3100/privacy",
    timeout: 300_000,
    reuseExistingServer: true,
    env: { ALLOW_MOCK_PROVIDERS: "1" },
  },
});
