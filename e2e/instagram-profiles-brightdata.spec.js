import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_USER_EMAIL || "nabilazra1234@gmail.com";
const PASSWORD = process.env.E2E_USER_PASSWORD || "M4gnifisien";

test("instagram profiles brightdata runs from dashboard", async ({ page }) => {
  test.setTimeout(180000);

  await page.goto("/");

  await page.getByRole("button", { name: "Account" }).click();
  await expect(page.getByRole("dialog", { name: "Masuk" })).toBeVisible();

  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/dashboard/automasi/instagram-profiles-brightdata");
  await expect(page.getByRole("heading", { name: "Instagram Profiles by URL" })).toBeVisible();

  const textarea = page.locator("textarea");
  await expect(textarea).toHaveCount(1);
  await textarea.fill(
    [
      "https://www.instagram.com/cats_of_world_/",
      "https://www.instagram.com/dogsofinstagram/",
    ].join("\n"),
  );

  await expect(page.getByText("2 URL valid")).toBeVisible();

  await page.getByRole("button", { name: "Jalankan automasi" }).click();

  await expect(
    page.getByText(/Status:\s+(queued|running|completed|failed)/i),
  ).toBeVisible();

  const completedChip = page.getByText(/Status:\s+completed/i);
  const runningChip = page.getByText(/Status:\s+running/i);
  const queuedChip = page.getByText(/Status:\s+queued/i);
  const failedChip = page.getByText(/Status:\s+failed/i);

  await expect
    .poll(
      async () => {
        if (await completedChip.isVisible().catch(() => false)) return "completed";
        if (await failedChip.isVisible().catch(() => false)) return "failed";
        if (await runningChip.isVisible().catch(() => false)) return "running";
        if (await queuedChip.isVisible().catch(() => false)) return "queued";
        return "unknown";
      },
      {
        timeout: 120000,
        intervals: [1000, 2000, 3000],
      },
    )
    .not.toBe("failed");

  await expect(
    completedChip.or(page.getByRole("heading", { name: "Snapshot pending" })),
  ).toBeVisible({ timeout: 120000 });

  await expect(
    page
      .getByRole("heading", { name: "Ringkasan hasil" })
      .or(page.getByRole("heading", { name: "Snapshot pending" })),
  ).toBeVisible();
});
