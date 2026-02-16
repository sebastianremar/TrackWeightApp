import { test, expect } from '@playwright/test';

// Unique email per test run to avoid conflicts
const testEmail = `e2e-${Date.now()}@test.com`;
const testPassword = 'TestPass123';

test.describe('Authentication', () => {
    test('signup creates account and redirects to dashboard', async ({ page }) => {
        await page.goto('/');

        // Should land on auth page
        await expect(page.getByText('Create Account')).toBeVisible();

        // Fill signup form
        await page.fill('#signup-first', 'E2E');
        await page.fill('#signup-last', 'Tester');
        await page.fill('#signup-email', testEmail);
        await page.fill('#signup-password', testPassword);
        await page.fill('#signup-confirm', testPassword);

        // Submit
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await expect(page).toHaveURL(/\/(dashboard)?$/);
    });

    test('signout returns to auth page', async ({ page }) => {
        // Sign in first
        await page.goto('/');
        await page.fill('#signin-email', testEmail);
        await page.fill('#signin-password', testPassword);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/(dashboard)?$/);

        // Find and click sign out
        await page.getByRole('button', { name: /sign out|logout|log out/i }).click();

        // Should return to auth page
        await expect(page.getByText('Sign In')).toBeVisible();
    });

    test('signin with valid credentials redirects to dashboard', async ({ page }) => {
        await page.goto('/');

        // Switch to sign in tab if needed
        const signinTab = page.getByText('Sign In');
        if (await signinTab.isVisible()) {
            await signinTab.click();
        }

        await page.fill('#signin-email', testEmail);
        await page.fill('#signin-password', testPassword);
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await expect(page).toHaveURL(/\/(dashboard)?$/);
    });

    test('signin with wrong password shows error', async ({ page }) => {
        await page.goto('/');

        const signinTab = page.getByText('Sign In');
        if (await signinTab.isVisible()) {
            await signinTab.click();
        }

        await page.fill('#signin-email', testEmail);
        await page.fill('#signin-password', 'WrongPass123');
        await page.click('button[type="submit"]');

        // Should show error
        await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    });
});
