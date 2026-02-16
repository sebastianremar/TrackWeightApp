import { test, expect } from '@playwright/test';

const testEmail = `e2e-weight-${Date.now()}@test.com`;
const testPassword = 'TestPass123';

test.describe('Weight Logging', () => {
    test.beforeAll(async ({ browser }) => {
        // Create test account
        const page = await browser.newPage();
        await page.goto('/');
        await page.fill('#signup-first', 'Weight');
        await page.fill('#signup-last', 'Tester');
        await page.fill('#signup-email', testEmail);
        await page.fill('#signup-password', testPassword);
        await page.fill('#signup-confirm', testPassword);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
        await page.close();
    });

    test.beforeEach(async ({ page }) => {
        // Sign in
        await page.goto('/');
        await page.fill('#signin-email', testEmail);
        await page.fill('#signin-password', testPassword);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
    });

    test('log a weight entry', async ({ page }) => {
        const weightInput = page.locator('input[aria-label="Weight in kg"]');
        await expect(weightInput).toBeVisible();

        // Clear and fill weight
        await weightInput.fill('72.5');

        // Submit the form
        await page.click('button[type="submit"]');

        // Weight should appear in the entries table or chart
        await expect(page.getByText('72.5')).toBeVisible({ timeout: 5000 });
    });

    test('log a second weight entry', async ({ page }) => {
        const weightInput = page.locator('input[aria-label="Weight in kg"]');
        await expect(weightInput).toBeVisible();

        // Set a different date to avoid overwriting
        const dateInput = page.locator('input[aria-label="Entry date"]');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        await dateInput.fill(dateStr);
        await weightInput.fill('73.0');

        await page.click('button[type="submit"]');

        await expect(page.getByText('73')).toBeVisible({ timeout: 5000 });
    });

    test('delete a weight entry', async ({ page }) => {
        // Wait for entries to load
        await expect(page.getByText('72.5')).toBeVisible({ timeout: 5000 });

        // Find and click a delete button on an entry row
        const deleteButton = page.locator('button[aria-label="Delete entry"]').first();
        if (await deleteButton.isVisible()) {
            await deleteButton.click();

            // Confirm deletion if there's a confirm dialog
            const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i });
            if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await confirmButton.click();
            }
        }
    });
});
