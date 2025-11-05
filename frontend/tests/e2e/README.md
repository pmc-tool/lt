# E2E Testing with Playwright

## Overview
End-to-end tests for the Provably-Fair Lottery Platform using Playwright. Tests cover critical user flows across desktop and mobile viewports.

## Setup

### Install Dependencies
```bash
npm install
npx playwright install
```

This will install Playwright and download browser binaries (Chromium, Firefox, WebKit).

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### Interactive UI Mode
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Specific Test File
```bash
npx playwright test tests/e2e/homepage.spec.ts
```

### With UI Reporter
```bash
npx playwright show-report
```

## Test Coverage

### User-Facing Tests

#### `homepage.spec.ts`
- Homepage loads correctly
- Displays active draws or empty state
- Navigation to login page works
- Responsive on mobile devices

#### `auth.spec.ts`
- Login page loads with OTP form
- Validation for empty identifier
- OTP request with valid phone number
- Navigation back to home

#### `verification.spec.ts`
- Verification page loads
- Display verification form or draw selection
- Show fairness information for settled draws
- Client-side verification calculation
- Responsive on mobile

### Admin Panel Tests

#### `admin.spec.ts`
- Admin login page loads
- Validation for empty credentials
- Error message for invalid credentials
- Successful login with valid credentials
- Dashboard displays statistics
- Navigation between admin sections (Draws, COD, Users, Audit)

## Prerequisites for Tests

### Backend Running
Most tests expect the backend to be running on `http://localhost:3000`. Start it with:
```bash
cd ../backend
npm run start:dev
```

### Frontend Running
Tests will automatically start the frontend dev server on `http://localhost:3001` via the `webServer` configuration in `playwright.config.ts`.

### Test Data
For admin tests, ensure default admin exists:
- Email: `admin@lottery.com`
- Password: `admin123`

These are created via the backend seed scripts.

## Configuration

See `playwright.config.ts` for:
- Browser configurations (Chromium, Firefox, WebKit)
- Mobile device emulation (Pixel 5, iPhone 12)
- Screenshot and trace settings
- Base URL and timeout configurations

## CI/CD Integration

The configuration is CI-ready:
- Retries failures 2 times in CI
- Runs sequentially (1 worker) in CI for stability
- Screenshots captured on failure
- Traces captured on first retry

### GitHub Actions Example
```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
```

## Test Strategy

### What's Tested
- **Page Loading**: All major pages load without errors
- **Navigation**: Users can navigate between pages
- **Form Validation**: Client-side validation works
- **Authentication**: Login flows for users and admins
- **Responsive Design**: Mobile viewport compatibility
- **Core Features**: Verification calculation, draw display

### What's NOT Tested (Yet)
- **Full Purchase Flow**: Requires mock payment/COD
- **OTP Verification**: Requires SMS mock
- **Admin CRUD Operations**: Create/update/delete actions
- **Network Failures**: Offline/error scenarios
- **Performance**: Load times, memory usage

## Extending Tests

### Adding a New Test
1. Create file in `tests/e2e/`
2. Import Playwright test utilities:
   ```typescript
   import { test, expect } from '@playwright/test';
   ```
3. Write test suite:
   ```typescript
   test.describe('Feature Name', () => {
     test('should do something', async ({ page }) => {
       await page.goto('/your-page');
       await expect(page.locator('h1')).toBeVisible();
     });
   });
   ```

### Best Practices
- Use `data-testid` attributes for stable selectors
- Wait for `networkidle` when testing API-dependent content
- Use `test.skip()` when backend is unavailable
- Test both success and error scenarios
- Keep tests independent and isolated

## Troubleshooting

### Tests Failing with Timeout
- Increase timeout in `playwright.config.ts`
- Check if backend/frontend are running
- Use `test:e2e:debug` to step through

### Browser Not Found
```bash
npx playwright install
```

### Port Already in Use
- Stop existing dev servers
- Change port in `playwright.config.ts` and frontend

### Flaky Tests
- Add explicit waits: `await page.waitForLoadState('networkidle')`
- Use retries for unstable tests
- Check for race conditions in async operations

## Performance Testing
For load testing, see `../load/README.md` for k6 scripts.
