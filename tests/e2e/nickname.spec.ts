import { test, expect } from '@playwright/test';

test('AUTH-03 nickname limit and legacy names fit a narrow mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  const input = page.getByLabel('어떻게 불러 드릴까요?');
  await expect(input).toHaveAttribute('maxlength', '10');
  await input.fill('가'.repeat(30));
  await expect(input).toHaveValue('가'.repeat(10));
  await page.getByRole('button', { name: '나의 첫 표현 만나기' }).click();
  await page.getByRole('button', { name: '보관했어요, 시작할게요' }).click();
  await expect(page.getByRole('heading', { name: '가'.repeat(10) + '님, 오늘도 한 걸음.' })).toBeVisible();
  const rejected = await page.request.post('/api/app', {
    headers: { Origin: 'http://127.0.0.1:5180' },
    data: { action: 'rename', name: 'x'.repeat(11) },
  });
  expect(rejected.status()).toBe(400);
  // Simulate a previously stored long profile without changing production or test storage.
  await page.route('**/api/app', async route => {
    const response = await route.fetch();
    const body = await response.json();
    if (body.view?.user) body.view.user.name = 'W'.repeat(30);
    await route.fulfill({ response, json: body });
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'W'.repeat(30) + '님, 오늘도 한 걸음.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/nickname-home-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '메뉴 열기' }).click();
  const profile = page.locator('.profile');
  expect(await profile.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByRole('link', { name: '설정', exact: true }).click();
  await expect(page.getByLabel('이름', { exact: true })).toHaveAttribute('maxlength', '10');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/nickname-mobile.png', fullPage: true });
});
