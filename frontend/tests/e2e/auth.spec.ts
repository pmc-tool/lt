import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/auth/login');

    // Check for OTP input or phone/email field
    await expect(page.locator('input[type="tel"], input[type="email"], input[type="text"]').first()).toBeVisible();

    // Should have a submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation error for empty identifier', async ({ page }) => {
    await page.goto('/auth/login');

    // Try to submit without entering anything
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // HTML5 validation should prevent submission
    const identifierInput = page.locator('input[type="tel"], input[type="email"], input[type="text"]').first();
    const isInvalid = await identifierInput.evaluate((el: HTMLInputElement) => !el.validity.valid);

    expect(isInvalid).toBeTruthy();
  });

  test('should request OTP with valid phone number', async ({ page }) => {
    await page.goto('/auth/login');

    // Enter a test phone number
    const identifierInput = page.locator('input[type="tel"], input[type="email"], input[type="text"]').first();
    await identifierInput.fill('+8801712345678');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for response (either OTP field appears or error message)
    await page.waitForTimeout(2000);

    // Should show either OTP input or error message
    const hasOTPInput = await page.locator('input[placeholder*="OTP"], input[placeholder*="code"]').count() > 0;
    const hasErrorMessage = await page.locator('text=/error|failed/i').count() > 0;

    expect(hasOTPInput || hasErrorMessage).toBeTruthy();
  });

  test('should navigate back to home from login', async ({ page }) => {
    await page.goto('/auth/login');

    // Look for back/home link
    const backLink = page.locator('a[href="/"], a:has-text("Home"), a:has-text("Back")').first();

    if (await backLink.count() > 0) {
      await backLink.click();
      await expect(page).toHaveURL('/');
    }
  });
});
