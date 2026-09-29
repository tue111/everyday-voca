import { test, expect } from '@playwright/test';
test('H-01 local frontend and API run together', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
  expect((await request.get('/api/health')).ok()).toBe(true);
});
