# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: instagram-profiles-brightdata.spec.js >> instagram profiles brightdata runs from dashboard
- Location: e2e\instagram-profiles-brightdata.spec.js:6:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Status:\s+(queued|running|completed|failed)/i)
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByText(/Status:\s+(queued|running|completed|failed)/i)

```

```yaml
- complementary:
  - text: Aispy
  - navigation "Main navigation":
    - list:
      - listitem:
        - button "Dashboard"
      - listitem:
        - button "AI Agents"
      - listitem:
        - button "Automasi"
      - listitem:
        - button "Module"
      - listitem:
        - button "File"
      - listitem:
        - button "Tagihan"
      - listitem:
        - button "Pengaturan"
      - listitem:
        - button "Dukungan"
  - text: nabil Super Admin
  - button "Keluar":
    - img
- main:
  - heading "Instagram Profiles by URL" [level=1]
  - paragraph: Masukkan daftar URL profil Instagram, lalu worker akan menjalankan Bright Data dan menyimpan hasilnya ke automation dashboard.
  - button "Kembali ke daftar Automasi"
  - heading "Input" [level=2]
  - paragraph: "Satu URL per baris. Kamu juga bisa upload CSV dengan kolom `url`."
  - text: Daftar URL Instagram
  - textbox "Daftar URL Instagram":
    - /placeholder: "https://www.instagram.com/cats_of_world_/\nhttps://www.instagram.com/dogsofinstagram/"
    - text: https://www.instagram.com/cats_of_world_/ https://www.instagram.com/dogsofinstagram/
  - text: Limit per input
  - textbox "Limit per input":
    - /placeholder: Kosongkan untuk default dataset
  - text: Upload CSV
  - button "Upload CSV"
  - text: 2 URL valid 0 invalid
  - button "Jalankan automasi"
- status
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const EMAIL = process.env.E2E_USER_EMAIL || "nabilazra1234@gmail.com";
  4  | const PASSWORD = process.env.E2E_USER_PASSWORD || "M4gnifisien";
  5  | 
  6  | test("instagram profiles brightdata runs from dashboard", async ({ page }) => {
  7  |   test.setTimeout(180000);
  8  | 
  9  |   await page.goto("/");
  10 | 
  11 |   await page.getByRole("button", { name: "Account" }).click();
  12 |   await expect(page.getByRole("dialog", { name: "Masuk" })).toBeVisible();
  13 | 
  14 |   await page.getByLabel("Email").fill(EMAIL);
  15 |   await page.getByLabel("Password").fill(PASSWORD);
  16 |   await page.getByRole("button", { name: "Masuk" }).click();
  17 | 
  18 |   await expect(page).toHaveURL(/\/dashboard$/);
  19 | 
  20 |   await page.goto("/dashboard/automasi/instagram-profiles-brightdata");
  21 |   await expect(page.getByRole("heading", { name: "Instagram Profiles by URL" })).toBeVisible();
  22 | 
  23 |   const textarea = page.locator("textarea");
  24 |   await expect(textarea).toHaveCount(1);
  25 |   await textarea.fill(
  26 |     [
  27 |       "https://www.instagram.com/cats_of_world_/",
  28 |       "https://www.instagram.com/dogsofinstagram/",
  29 |     ].join("\n"),
  30 |   );
  31 | 
  32 |   await expect(page.getByText("2 URL valid")).toBeVisible();
  33 | 
  34 |   await page.getByRole("button", { name: "Jalankan automasi" }).click();
  35 | 
  36 |   await expect(
  37 |     page.getByText(/Status:\s+(queued|running|completed|failed)/i),
> 38 |   ).toBeVisible();
     |     ^ Error: expect(locator).toBeVisible() failed
  39 | 
  40 |   const completedChip = page.getByText(/Status:\s+completed/i);
  41 |   const runningChip = page.getByText(/Status:\s+running/i);
  42 |   const queuedChip = page.getByText(/Status:\s+queued/i);
  43 |   const failedChip = page.getByText(/Status:\s+failed/i);
  44 | 
  45 |   await expect
  46 |     .poll(
  47 |       async () => {
  48 |         if (await completedChip.isVisible().catch(() => false)) return "completed";
  49 |         if (await failedChip.isVisible().catch(() => false)) return "failed";
  50 |         if (await runningChip.isVisible().catch(() => false)) return "running";
  51 |         if (await queuedChip.isVisible().catch(() => false)) return "queued";
  52 |         return "unknown";
  53 |       },
  54 |       {
  55 |         timeout: 120000,
  56 |         intervals: [1000, 2000, 3000],
  57 |       },
  58 |     )
  59 |     .not.toBe("failed");
  60 | 
  61 |   await expect(
  62 |     completedChip.or(page.getByRole("heading", { name: "Snapshot pending" })),
  63 |   ).toBeVisible({ timeout: 120000 });
  64 | 
  65 |   await expect(
  66 |     page
  67 |       .getByRole("heading", { name: "Ringkasan hasil" })
  68 |       .or(page.getByRole("heading", { name: "Snapshot pending" })),
  69 |   ).toBeVisible();
  70 | });
  71 | 
```