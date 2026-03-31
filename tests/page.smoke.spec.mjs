import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const liveFixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fixtures/live_early_season.json'), 'utf8'));
const leagueFixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fixtures/league_sp_cup_2026.json'), 'utf8'));

async function wireFixtures(page) {
  await page.route(/data\/live\.json(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(liveFixture)
    });
  });

  await page.route(/fixtures\/league_sp_cup_2026\.json(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(leagueFixture)
    });
  });
}

test('fixture-backed V1 league loads dynamic rivalry tabs and renders war room', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await wireFixtures(page);

  await page.goto('http://127.0.0.1:4173/index.html?league=sp-cup-2026');

  await expect(page.locator('#leagueTitle')).toContainText('SP Cup 2026 War Room');
  await expect(page.locator('#leaguePill')).toContainText('SP Cup 2026');
  await expect(page.getByRole('button', { name: 'Senthil vs Sai' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Senthil vs Vibeesh' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sai vs Vibeesh' })).toBeVisible();
  await expect(page.locator('#scoreboard .player-box')).toHaveCount(2);
  await expect(page.locator('#breakdownTable tbody tr')).toHaveCount(15);
  await expect(page.locator('#providerPill')).toContainText('Provider: Live /');
  await expect(page.locator('#updatedPill')).not.toHaveText('Last updated: --');
  await expect(page.locator('#breakdownTable tbody tr').nth(1).locator('.live-value-pill')).toHaveCount(2);
  await expect(page.locator('#clutchHeadline')).toBeVisible();
  await expect(page.locator('#wormChartShell')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('requested matchup from URL opens the correct rivalry tab', async ({ page }) => {
  await wireFixtures(page);
  await page.goto('http://127.0.0.1:4173/index.html?league=sp-cup-2026&matchup=sai-vibeesh');

  await expect(page.getByRole('button', { name: 'Sai vs Vibeesh' })).toHaveClass(/active/);
  await expect(page.locator('#scoreboard .player-name').first()).toContainText('Sai');
  await expect(page.locator('#scoreboard .player-name').nth(1)).toContainText('Vibeesh');
});
