import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("home renders entry ritual", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /wegoagane/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".entry-grid")).toBeVisible();
  });

  test("detailed build (plan flow) entry is reachable", async ({ page }) => {
    await page.goto("/");
    const detailed = page.getByRole("link", { name: /Detailed build/i });
    await expect(detailed).toBeVisible();
    await expect(detailed).toHaveAttribute("href", "/draft-a-run/intent");
  });

  test("death recovery entry is reachable", async ({ page }) => {
    await page.goto("/");
    const death = page.getByRole("link", { name: /I died|recover from death/i });
    await expect(death).toBeVisible();
    await expect(death).toHaveAttribute("href", "/release-spirit/next");
  });
});
