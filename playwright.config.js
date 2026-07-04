const isCI = !!process.env.CI;

export default {
  testDir: "./e2e",
  timeout: 120000,
  expect: {
    timeout: 20000,
  },
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev:local",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
};
