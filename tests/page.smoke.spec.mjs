import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const liveFixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fixtures/live_early_season.json'), 'utf8'));

test('war room v1 renders a single public duel page with a duel picker and stat value chips without runtime errors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.route(/data\/live\.json(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(liveFixture)
    });
  });

  await page.goto('http://127.0.0.1:4173/index.html?room=sp-cup-2026&duel=senthil-vibeesh');

  await expect(page.locator('#leagueTitle')).toContainText('SP Cup 2026 War Room');
  await expect(page.locator('#leaguePill')).toContainText('War Room: SP Cup 2026');
  await expect(page.getByRole('button', { name: 'War Room' })).toBeVisible();
  await expect(page.getByLabel('Browse public duel')).toBeVisible();
  await expect(page.locator('#duelPicker')).toHaveValue('senthil-vibeesh');
  await expect(page.locator('#viewTabs')).toContainText('Active duel: Senthil vs Vibeesh');
  await expect(page.locator('#viewTabs')).toContainText('Visibility: public duel page');

  await expect(page.locator('#scoreboard .player-box')).toHaveCount(2);
  await expect(page.locator('#breakdownTable tbody tr')).toHaveCount(15);
  await expect(page.locator('#wormChart')).toBeVisible();
  await expect(page.locator('#breakdownTable tbody tr').nth(1).locator('.live-value-pill').first()).toBeVisible();

  await page.selectOption('#duelPicker', 'senthil-sai');
  await expect(page.locator('#viewTabs')).toContainText('Active duel: Senthil vs Sai');

  await page.getByRole('button', { name: 'Nerd Room' }).click();
  await expect(page.locator('#statsSummary')).toContainText('board');

  await page.getByRole('button', { name: 'Schedule' }).click();
  await expect(page.locator('#scheduleSummary')).toContainText('League-stage schedule');
  await expect(page.locator('#scheduleSummary')).toContainText('Next planned update window');
  await expect(page.locator('#scheduleTable tbody tr')).toHaveCount(70);

  expect(pageErrors).toEqual([]);
});
