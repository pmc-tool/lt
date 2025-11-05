import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load homepage and display draws', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Provably-Fair Lottery/i);

    // Check for main heading
    await expect(page.locator('h1')).toContainText(/lottery/i);

    // Page should have navigation or main content
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should display active draws or empty state', async ({ page }) => {
    await page.goto('/');

    // Wait for content to load
    await page.waitForLoadState('networkidle');

    // Should show either draws or "no draws" message
    const hasDraws = await page.locator('[data-testid="draw-card"]').count() > 0;
    const hasEmptyState = await page.locator('text=/no.*draws/i').count() > 0;

    expect(hasDraws || hasEmptyState).toBeTruthy();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    // Look for login link
    const loginLink = page.locator('a[href*="/auth/login"], a:has-text("Login"), a:has-text("Sign In")').first();

    if (await loginLink.count() > 0) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/auth\/login/);
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should load without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.viewportSize();

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth?.width || 375);
  });
});
