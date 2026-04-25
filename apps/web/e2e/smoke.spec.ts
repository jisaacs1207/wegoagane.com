import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("home renders entry ritual", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /wegoagane/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".entry-grid")).toBeVisible();
  });

  test("draft a run entry is reachable", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Draft a Run/i })).toBeVisible();
  });

  test("release spirit entry is reachable", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Release Spirit/i })).toBeVisible();
  });
});
