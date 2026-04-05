import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const liveFixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fixtures/live_early_season.json'), 'utf8'));

test('duels v1 renders public duel browsing plus local create, join, and submit flows without runtime errors', async ({ page }) => {
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

  await expect(page.locator('#leagueTitle')).toContainText('SP Cup 2026 Duels');
  await expect(page.locator('#leaguePill')).toContainText('Duels: SP Cup 2026');
  await expect(page.getByRole('button', { name: 'Duels' })).toBeVisible();
  await expect(page.getByLabel('Browse public duel')).toBeVisible();
  await expect(page.locator('#authPanel')).toContainText('Sign in');
  await expect(page.locator('#createDuelPanel')).toContainText('Create public duel');
  await expect(page.locator('#duelPicker')).toHaveValue('senthil-vibeesh');
  await expect(page.locator('#viewTabs')).toContainText('Active duel: Senthil vs Vibeesh');
  await expect(page.locator('#viewTabs')).toContainText('Visibility: public duel page');
  await expect(page.locator('#duelDirectorySummary')).toContainText('public duel');
  await expect(page.locator('#duelDirectory [data-duel-card]')).toHaveCount(2);
  await expect(page.locator('#duelDirectory')).toContainText('Leader');
  await expect(page.locator('#duelDirectory')).toContainText('Margin');
  await expect(page.locator('#duelDirectory')).toContainText('Fronts won');
  await expect(page.locator('#duelDirectory')).toContainText('Last updated');
  await expect(page.locator('#duelDirectory')).toContainText('Copy link');
  await expect(page.locator('#duelDirectory [data-duel-card]').first()).toContainText('Senthil vs Sai');
  await expect(page.locator('#duelDirectory')).toContainText('Senthil vs Vibeesh');
  await expect(page.getByRole('button', { name: 'Copy duel link' })).toBeVisible();

  await expect(page.locator('#scoreboard .player-box')).toHaveCount(2);
  await expect(page.locator('#breakdownTable tbody tr')).toHaveCount(15);
  await expect(page.locator('#wormChart')).toBeVisible();
  await expect(page.locator('#breakdownTable tbody tr').nth(1).locator('.live-value-pill').first()).toBeVisible();

  await page.locator('#duelDirectory [data-open-duel="senthil-sai"]').click();
  await expect(page.locator('#viewTabs')).toContainText('Active duel: Senthil vs Sai');
  await expect(page.locator('#duelPicker')).toHaveValue('senthil-sai');
  await expect(page).toHaveURL(/duel=senthil-sai/);

  await page.locator('#authDisplayName').fill('Anand');
  await page.locator('#authOwnerId').fill('anand');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('#authPanel')).toContainText('Signed in as Anand');

  await page.locator('#createOpponentName').fill('Bala');
  await page.getByRole('button', { name: 'Create public duel' }).click();
  await expect(page.locator('#viewTabs')).toContainText('Active duel: Anand vs Bala');
  await expect(page.locator('#duelDirectory')).toContainText('Anand vs Bala');
  await expect(page).toHaveURL(/share=/);

  await page.evaluate(() => {
    document.querySelectorAll('#activeEntryForm [data-pick-key]').forEach((input, index) => {
      input.value = `Anand pick ${index + 1}`;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await page.getByRole('button', { name: 'Submit picks' }).click();
  await expect(page.locator('#duelControlsPanel')).toContainText('Bala still needs to submit');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.locator('#authDisplayName').fill('Bala');
  await page.locator('#authOwnerId').fill('bala');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Join duel' })).toBeVisible();
  await page.getByRole('button', { name: 'Join duel' }).click();

  await page.evaluate(() => {
    document.querySelectorAll('#activeEntryForm [data-pick-key]').forEach((input, index) => {
      input.value = `Bala pick ${index + 1}`;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await page.getByRole('button', { name: 'Submit picks' }).click();
  await expect(page.locator('#scoreboard .player-box')).toHaveCount(2);
  await expect(page.locator('#metricOverall')).toContainText('0 - 0');
  await expect(page.locator('#duelDirectory')).toContainText('Anand vs Bala');

  await page.getByRole('button', { name: 'Nerd Room' }).click();
  await expect(page.locator('#statsSummary')).toContainText('board');

  await page.getByRole('button', { name: 'Schedule' }).click();
  await expect(page.locator('#scheduleSummary')).toContainText('League-stage schedule');
  await expect(page.locator('#scheduleSummary')).toContainText('Next planned update window');
  await expect(page.locator('#scheduleTable tbody tr')).toHaveCount(70);

  expect(pageErrors).toEqual([]);
});
