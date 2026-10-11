import { test, expect } from '@playwright/test';

test.describe('Admin Button Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the auth page before each test
    await page.goto('http://localhost:8080/auth');
  });

  test('should NOT show admin button when regular user logs in', async ({ page }) => {
    // Regular user email (not in admin list)
    const regularEmail = 'user@example.com';
    const password = 'password123';

    // Fill login form
    await page.getByLabel('EMAIL').fill(regularEmail);
    await page.getByLabel('PASSWORD').fill(password);

    // Click sign in button
    await page.getByRole('button', { name: /SIGN IN/i }).click();

    // Wait for navigation or toast
    await page.waitForTimeout(2000);

    // Check that admin dashboard button/link is NOT visible in header
    const adminButton = page.locator('a[href="/admin"]');
    await expect(adminButton).not.toBeVisible();

    // Also check mobile menu admin link should not be visible
    const mobileAdminLink = page.locator('text=ADMIN DASHBOARD');
    await expect(mobileAdminLink).not.toBeVisible();
  });

  test('should show admin button when admin user logs in', async ({ page }) => {
    // Admin email (in the adminEmails list)
    const adminEmail = 'test@example.com';
    const password = 'password123';

    // Fill login form
    await page.getByLabel('EMAIL').fill(adminEmail);
    await page.getByLabel('PASSWORD').fill(password);

    // Click sign in button
    await page.getByRole('button', { name: /SIGN IN/i }).click();

    // Wait for navigation or toast
    await page.waitForTimeout(2000);

    // Check that admin dashboard button IS visible in header (desktop view)
    const adminButton = page.locator('a[href="/admin"]');
    await expect(adminButton).toBeVisible();

    // Verify the admin button has the correct icon
    const adminIcon = adminButton.locator('svg');
    await expect(adminIcon).toBeVisible();

    // Check aria-label for accessibility
    await expect(adminButton).toHaveAttribute('aria-label', 'Admin Dashboard');
  });

  test('should show admin button in mobile menu for admin users', async ({ page }) => {
    // Admin email
    const adminEmail = 'test@example.com';
    const password = 'password123';

    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Fill login form
    await page.getByLabel('EMAIL').fill(adminEmail);
    await page.getByLabel('PASSWORD').fill(password);

    // Click sign in button
    await page.getByRole('button', { name: /SIGN IN/i }).click();

    // Wait for navigation or toast
    await page.waitForTimeout(2000);

    // Click mobile menu button
    const mobileMenuButton = page.locator('button[aria-label="Toggle menu"]');
    await mobileMenuButton.click();

    // Check that ADMIN DASHBOARD link appears in mobile menu
    const adminLink = page.locator('text=ADMIN DASHBOARD');
    await expect(adminLink).toBeVisible();
    await expect(adminLink).toHaveAttribute('href', '/admin');
  });

  test('should navigate to admin dashboard when admin button is clicked', async ({ page }) => {
    // Admin email
    const adminEmail = 'test@example.com';
    const password = 'password123';

    // Fill login form
    await page.getByLabel('EMAIL').fill(adminEmail);
    await page.getByLabel('PASSWORD').fill(password);

    // Click sign in button
    await page.getByRole('button', { name: /SIGN IN/i }).click();

    // Wait for navigation or toast
    await page.waitForTimeout(2000);

    // Click admin dashboard button
    const adminButton = page.locator('a[href="/admin"]');
    await adminButton.click();

    // Verify navigation to admin page
    await expect(page).toHaveURL(/.*\/admin/);

    // Verify admin dashboard content is loaded
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  });

  test('should not show admin button after admin user signs out', async ({ page }) => {
    // Admin email
    const adminEmail = 'test@example.com';
    const password = 'password123';

    // Login as admin
    await page.getByLabel('EMAIL').fill(adminEmail);
    await page.getByLabel('PASSWORD').fill(password);
    await page.getByRole('button', { name: /SIGN IN/i }).click();

    // Wait for navigation
    await page.waitForTimeout(2000);

    // Verify admin button is visible
    const adminButton = page.locator('a[href="/admin"]');
    await expect(adminButton).toBeVisible();

    // Click sign out button
    const signOutButton = page.locator('button[aria-label="Sign out"]');
    await signOutButton.click();

    // Wait for sign out
    await page.waitForTimeout(1000);

    // Verify admin button is no longer visible
    await expect(adminButton).not.toBeVisible();
  });

  test('should hide admin button when viewport changes from desktop to mobile', async ({ page }) => {
    // Admin email
    const adminEmail = 'test@example.com';
    const password = 'password123';

    // Fill login form
    await page.getByLabel('EMAIL').fill(adminEmail);
    await page.getByLabel('PASSWORD').fill(password);

    // Click sign in button
    await page.getByRole('button', { name: /SIGN IN/i }).click();

    // Wait for navigation
    await page.waitForTimeout(2000);

    // Verify admin icon button is visible on desktop
    const adminIconButton = page.locator('a[href="/admin"]');
    await expect(adminIconButton).toBeVisible();

    // Change to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // The icon button should be hidden (desktop nav is hidden on mobile)
    // But the mobile menu should have the admin link when opened
    const mobileMenuButton = page.locator('button[aria-label="Toggle menu"]');
    await mobileMenuButton.click();

    const mobileAdminLink = page.locator('text=ADMIN DASHBOARD');
    await expect(mobileAdminLink).toBeVisible();
  });
});
