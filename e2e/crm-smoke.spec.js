import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_USER_EMAIL || "nabilazra1234@gmail.com";
const PASSWORD = process.env.E2E_USER_PASSWORD || "M4gnifisien";

async function login(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Account" }).click();
  await expect(page.getByRole("dialog", { name: "Masuk" })).toBeVisible();
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("crm smoke flow validates core click paths", async ({ page }) => {
  test.setTimeout(180000);

  await login(page);
  await page.goto("/dashboard/apps/crm/overview");

  await expect(page.getByTestId("crm-shell")).toBeVisible();
  await expect(page.getByTestId("crm-section-overview")).toBeVisible();

  await page.getByTestId("crm-nav-people").click();
  await expect(page.getByTestId("crm-section-people")).toBeVisible();
  await expect(page.getByTestId("crm-people-filters")).toBeVisible();

  await page.getByTestId("crm-nav-organizations").click();
  await expect(page.getByTestId("crm-section-organizations")).toBeVisible();
  await page.getByTestId("crm-create-organization").click();
  await page.getByTestId("crm-organization-name-input").fill(
    `E2E Org ${Date.now()}`,
  );
  await page.getByTestId("crm-organization-save").click();
  await expect(page.getByTestId("crm-organization-detail")).toBeVisible();

  await page.getByTestId("crm-nav-tasks").click();
  await expect(page.getByTestId("crm-section-tasks")).toBeVisible();
  await page.getByTestId("crm-create-task").click();
  await page.getByTestId("crm-task-title-input").fill(`E2E Task ${Date.now()}`);
  await page.getByTestId("crm-task-save").click();
  await expect(page.getByTestId("crm-task-detail")).toBeVisible();

  await page.getByTestId("crm-nav-deals").click();
  await expect(page.getByTestId("crm-section-deals")).toBeVisible();
  await page.getByTestId("crm-deals-view-table").click();
  await expect(page.getByTestId("crm-deals-table")).toBeVisible();
  await page.getByTestId("crm-deals-view-board").click();
  await expect(page.getByTestId("crm-deals-board")).toBeVisible();

  await page.getByTestId("crm-nav-settings").click();
  await expect(page.getByTestId("crm-section-settings")).toBeVisible();
  await expect(page.getByTestId("crm-settings-streams")).toBeVisible();
});
