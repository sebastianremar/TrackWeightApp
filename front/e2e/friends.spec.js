import { test, expect } from '@playwright/test';

const userA = `e2e-friend-a-${Date.now()}@test.com`;
const userB = `e2e-friend-b-${Date.now()}@test.com`;
const testPassword = 'TestPass123';

test.describe('Friends', () => {
    test.beforeAll(async ({ browser }) => {
        // Create both test accounts
        for (const email of [userA, userB]) {
            const page = await browser.newPage();
            await page.goto('/');
            await page.fill('#signup-first', email === userA ? 'Alice' : 'Bob');
            await page.fill('#signup-email', email);
            await page.fill('#signup-password', testPassword);
            await page.fill('#signup-confirm', testPassword);
            await page.click('button[type="submit"]');
            await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
            await page.close();
        }
    });

    test('send friend request', async ({ page }) => {
        // Sign in as user A
        await page.goto('/');
        await page.fill('#signin-email', userA);
        await page.fill('#signin-password', testPassword);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

        // Navigate to friends page
        await page.goto('/friends');
        await expect(page).toHaveURL('/friends');

        // Click add friend button
        const addButton = page.getByRole('button', { name: /add friend/i });
        await expect(addButton).toBeVisible({ timeout: 5000 });
        await addButton.click();

        // Fill friend email in the modal
        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible();
        await emailInput.fill(userB);

        // Send request
        await page.getByRole('button', { name: /send request/i }).click();

        // Should show success message
        await expect(page.getByText(/friend request sent/i)).toBeVisible({ timeout: 5000 });
    });

    test('accept friend request', async ({ page }) => {
        // Sign in as user B
        await page.goto('/');
        await page.fill('#signin-email', userB);
        await page.fill('#signin-password', testPassword);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

        // Navigate to friends page
        await page.goto('/friends');

        // Should see pending request from user A
        await expect(page.getByText('Alice')).toBeVisible({ timeout: 5000 });

        // Accept the request
        const acceptButton = page.getByRole('button', { name: /accept/i });
        await expect(acceptButton).toBeVisible();
        await acceptButton.click();

        // Alice should now appear as a friend (not in pending)
        await expect(page.getByText('Alice')).toBeVisible();
    });
});
