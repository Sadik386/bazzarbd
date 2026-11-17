import { test, expect } from "@playwright/test";

test.describe("Admin Button Visibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
  });

  test("should NOT show admin button when regular user logs in", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "mock-user-token",
          user: { id: "u1", email: "user@example.com", display_name: "Shopper", role: "USER" },
        }),
      });
    });

    await page.getByLabel("EMAIL").fill("user@example.com");
    await page.getByLabel("PASSWORD").fill("password123");
    await page.getByRole("button", { name: /SIGN IN/i }).click();

    await expect(page).toHaveURL("/");
    await expect(page.locator('a[href="/admin"]')).not.toBeVisible();
  });

  test("should show admin button when admin user logs in and navigate to Admin Dashboard", async ({
    page,
  }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "mock-admin-token",
          user: {
            id: "a1",
            email: "admin@example.com",
            display_name: "Admin",
            role: "SUPER_ADMIN",
          },
        }),
      });
    });

    await page.getByLabel("EMAIL").fill("admin@example.com");
    await page.getByLabel("PASSWORD").fill("password123");
    await page.getByRole("button", { name: /SIGN IN/i }).click();

    const adminButton = page.locator('a[href="/admin"]');
    await expect(adminButton).toBeVisible();
    await expect(adminButton).toHaveAttribute("aria-label", "Admin Dashboard");

    await adminButton.click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
  });

  test("should show admin link in mobile menu and hide after sign out", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "mock-admin-token",
          user: {
            id: "a1",
            email: "admin@example.com",
            display_name: "Admin",
            role: "SUPER_ADMIN",
          },
        }),
      });
    });

    await page.getByLabel("EMAIL").fill("admin@example.com");
    await page.getByLabel("PASSWORD").fill("password123");
    await page.getByRole("button", { name: /SIGN IN/i }).click();

    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator('button[aria-label="Toggle menu"]').click();
    const mobileAdminLink = page.locator('a[href="/admin"]', { hasText: "Admin Dashboard" });
    await expect(mobileAdminLink).toBeVisible();

    await page.getByRole("button", { name: /Sign out/i }).click();
    await expect(page.locator('a[href="/admin"]')).not.toBeVisible();
  });
});
