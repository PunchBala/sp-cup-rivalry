import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fixtures/live_early_season.json'), 'utf8'));

test('home page renders live board from fixture data without runtime errors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.route(/data\/live\.json(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture)
    });
  });

  await page.goto('http://127.0.0.1:4173/index.html');

  await expect(page.locator('#scoreboard .player-box')).toHaveCount(2);
  await expect(page.locator('#breakdownTable tbody tr')).toHaveCount(15);
  await expect(page.locator('#providerPill')).toContainText('Provider: Live /');
  await expect(page.locator('#updatedPill')).not.toHaveText('Last updated: --');
  await expect(page.locator('#nextMatchTeams')).not.toHaveText('--');
  await expect(page.locator('#breakdownTable tbody tr').nth(1).locator('.live-value-pill')).toHaveCount(2);
  await expect(page.locator('#breakdownTable tbody tr').nth(1).locator('.live-value-pill').first()).toContainText('runs');
  await expect(page.locator('#breakdownTable tbody tr').first().locator('.live-value-pill')).toHaveCount(0);
  await expect(page.locator('#clutchHeadline')).toBeVisible();
  await expect(page.locator('#wormChartShell')).toBeVisible();

  await page.getByRole('button', { name: 'Nerd Room' }).click();
  await expect(page.locator('#statsSummary')).toContainText('board');
  const statRows = await page.locator('#statsTable tbody tr').count();
  expect(statRows).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Schedule' }).click();
  await expect(page.locator('#scheduleSummary')).toContainText('League-stage schedule');
  const scheduleRows = await page.locator('#scheduleTable tbody tr').count();
  expect(scheduleRows).toBeGreaterThan(50);
  await expect(page.locator('#scheduleTable tbody tr').first()).toContainText('vs');
  await expect(page.locator('#scheduleTable tbody tr').first()).not.toContainText('@');

  expect(pageErrors).toEqual([]);
});
