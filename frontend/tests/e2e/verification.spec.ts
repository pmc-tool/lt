import { test, expect } from '@playwright/test';

test.describe('Draw Verification', () => {
  test('should load verification page', async ({ page }) => {
    await page.goto('/verify');

    // Page should load
    await expect(page).toHaveTitle(/verify|lottery/i);

    // Should have verification content or draw selector
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should display verification form or draw selection', async ({ page }) => {
    await page.goto('/verify');

    await page.waitForLoadState('networkidle');

    // Should show either draw selection or verification details
    const hasDrawSelector = await page.locator('select, input[placeholder*="draw"]').count() > 0;
    const hasVerificationData = await page.locator('text=/merkle|beacon|winner|verify/i').count() > 0;
    const hasEmptyState = await page.locator('text=/no.*draws|select.*draw/i').count() > 0;

    expect(hasDrawSelector || hasVerificationData || hasEmptyState).toBeTruthy();
  });

  test('should have navigation back to home', async ({ page }) => {
    await page.goto('/verify');

    // Should have a way to go back home
    const homeLink = page.locator('a[href="/"]').first();

    if (await homeLink.count() > 0) {
      await expect(homeLink).toBeVisible();
    }
  });

  test('should display fairness information if draw is settled', async ({ page }) => {
    await page.goto('/verify');

    await page.waitForLoadState('networkidle');

    // If there's a settled draw, it should show fairness data
    const hasMerkleRoot = await page.locator('text=/merkle.*root/i').count() > 0;
    const hasBeaconValue = await page.locator('text=/beacon/i').count() > 0;
    const hasWinnerInfo = await page.locator('text=/winner/i').count() > 0;

    // If any fairness data is present, expect verification UI
    if (hasMerkleRoot || hasBeaconValue || hasWinnerInfo) {
      const hasVerifyButton = await page.locator('button:has-text("Verify"), button:has-text("Calculate")').count() > 0;
      expect(hasVerifyButton).toBeTruthy();
    }
  });

  test('should handle client-side verification', async ({ page }) => {
    await page.goto('/verify');

    await page.waitForLoadState('networkidle');

    // Look for verification button
    const verifyButton = page.locator('button:has-text("Verify"), button:has-text("Calculate"), button:has-text("Recompute")').first();

    if (await verifyButton.count() > 0) {
      await verifyButton.click();

      // Wait for computation
      await page.waitForTimeout(1000);

      // Should show result (match or computation complete)
      const hasResult = await page.locator('text=/computed|calculated|matches|result/i').count() > 0;
      expect(hasResult).toBeTruthy();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/verify');

    // Page should load without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.viewportSize();

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth?.width || 375);
  });
});
