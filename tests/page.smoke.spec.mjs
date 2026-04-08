import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const liveFixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fixtures/live_early_season.json'), 'utf8'));

async function setHiddenPick(page, key, value) {
  await page.locator(`#activeEntryForm input[data-pick-key="${key}"]`).evaluate((input, nextValue) => {
    input.value = nextValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function setHiddenPicks(page, picks) {
  for (const [key, value] of Object.entries(picks)) {
    await setHiddenPick(page, key, value);
  }
}

async function expectLocatorCountAtLeast(locator, minimum) {
  await expect
    .poll(async () => locator.count(), {
      message: `Expected locator count to reach at least ${minimum}`
    })
    .toBeGreaterThanOrEqual(minimum);
}

test('duels beta supports picker search, clash resolution, and armed start gating without runtime errors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.addInitScript(() => {
    window.__DUELS_TEST_NOW__ = '2026-04-05T08:00:00Z';
    window.DUELS_BACKEND_CONFIG = { enabled: false };
  });

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
  await expect(page.getByRole('button', { name: 'Duel', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mini Fantasy', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Duel', exact: true }).click();
  await expect(page.locator('#browseDuelsButton')).toBeVisible();
  await expect(page.locator('#createDuelButton')).toBeVisible();
  await expect(page.locator('#profileChipButton')).toContainText('Sign in');

  await page.locator('#browseDuelsButton').click();
  await expect(page.locator('#browseDrawer')).toBeVisible();
  await expectLocatorCountAtLeast(page.locator('#duelDirectory [data-duel-card]'), 2);
  await expect(page.locator('#duelDirectory')).toContainText('Senthil vs Sai');
  await expect(page.locator('#duelDirectory')).toContainText('Senthil vs Vibeesh');
  await page.locator('#browseDrawer [data-close-drawer="browse"]').click();

  await page.locator('#profileChipButton').click();
  await expect(page.locator('#profileDrawer')).toBeVisible();
  await page.locator('#authDisplayName').fill('Senthil');
  await page.locator('#authOwnerId').fill('senthil');
  await page.locator('#authForm button[type="submit"]').click();
  await expect(page.locator('#myDuelsPanel')).toContainText('Senthil vs Sai');
  await expect(page.locator('#myDuelsPanel')).toContainText('Live from Match 1');
  await page.locator('#authPanel').getByRole('button', { name: 'Sign out' }).click();

  await page.locator('#authDisplayName').fill('Anand');
  await page.locator('#authOwnerId').fill('anand');
  await page.locator('#authForm button[type="submit"]').click();
  await expect(page.locator('#authPanel')).toContainText('Signed in as Anand');
  await expect(page.locator('#profilePanel')).toContainText('Anand');
  await expect(page.locator('#myDuelsPanel')).toContainText('No duels yet');
  await page.locator('#profileDrawer [data-close-drawer="profile"]').click();
  await page.locator('#createDuelButton').click();
  await expect(page.locator('#createDrawer')).toBeVisible();
  await expect(page.locator('#createDuelPanel')).toContainText('How Duel works');
  await expect(page.locator('#createDuelPanel')).toContainText('Join duel by code');

  await page.getByRole('button', { name: 'Create public duel' }).click();
  await expect(page.locator('#manageDrawer')).toBeVisible();
  await expect(page.locator('#viewTabs')).toContainText('Active duel: Anand vs Open challenger');
  await expect(page).toHaveURL(/share=/);
  await expect(page.locator('#duelControlsPanel')).toContainText('Code:');
  await expect(page.locator('#duelControlsPanel')).toContainText('Duel readiness');
  await expect(page.getByRole('button', { name: 'Copy invite message' })).toBeVisible();
  const duelCode = new URL(page.url()).searchParams.get('duel');
  expect(duelCode).toBeTruthy();

  await page.locator('[data-open-picker="titleWinner"]').click();
  await expect(page.locator('#pickPickerModal')).toBeVisible();
  await page.getByRole('button', { name: 'Mumbai Indians' }).click();
  await expect(page.locator('[data-pick-row="titleWinner"] [data-picked-value]')).toContainText('Mumbai Indians');

  await page.locator('[data-open-picker="orangeCap"]').click();
  await page.locator('#pickPickerSearch').fill('rahul');
  await page.locator('[data-picker-value="KL Rahul"]').click();
  await expect(page.locator('[data-pick-row="orangeCap"] [data-picked-value]')).toContainText('KL Rahul');

  await page.locator('[data-open-picker="uncappedMvp"]').click();
  await page.locator('[data-picker-team="DC"]').click();
  await page.locator('[data-picker-value="Sameer Rizvi"]').click();
  await expect(page.locator('[data-pick-row="uncappedMvp"] [data-picked-value]')).toContainText('Sameer Rizvi');

  await setHiddenPicks(page, {
    mostSixes: 'Nicholas Pooran',
    purpleCap: 'Kuldeep Yadav',
    mostDots: 'Kuldeep Yadav',
    mvp: 'KL Rahul',
    fairPlay: 'Chennai Super Kings',
    highestScoreTeam: 'Sunrisers Hyderabad',
    striker: 'Tristan Stubbs',
    bestBowlingFigures: 'Kuldeep Yadav',
    bestBowlingStrikeRate: 'Kuldeep Yadav',
    mostCatches: 'Rinku Singh',
    tableBottom: 'Rajasthan Royals',
    leastMvp: 'Mahendra Singh Dhoni'
  });

  await page.locator('#submitPicksButton').click();
  await expect(page.locator('#duelControlsPanel')).toContainText('Waiting for both pick sheets');

  await page.locator('#manageDrawer [data-close-drawer="manage"]').click();
  await page.locator('#profileChipButton').click();
  await page.locator('#authPanel').getByRole('button', { name: 'Sign out' }).click();
  await page.locator('#authDisplayName').fill('Bala');
  await page.locator('#authOwnerId').fill('bala');
  await page.locator('#authForm button[type="submit"]').click();
  await page.locator('#profileDrawer [data-close-drawer="profile"]').click();
  await page.locator('#createDuelButton').click();
  await page.locator('#joinByCodeInput').fill(duelCode);
  await page.getByRole('button', { name: 'Join by code' }).click();
  await expect(page.locator('#manageDrawer')).toBeVisible();
  await expect(page.locator('#viewTabs')).toContainText('Active duel: Anand vs Bala');
  await page.locator('#manageDrawer [data-close-drawer="manage"]').click();
  await page.locator('#browseDuelsButton').click();
  await expect(page.locator('#browseDrawer')).toBeVisible();
  await page.getByRole('button', { name: 'My duels' }).click();
  await expect(page.locator('#duelDirectory')).toContainText('Anand vs Bala');
  await page.getByRole('button', { name: 'All' }).click();
  await page.locator('#browseDrawer [data-close-drawer="browse"]').click();
  await page.locator('#manageDuelButton').click();

  await page.locator('[data-open-picker="titleWinner"]').click();
  await page.getByRole('button', { name: 'Mumbai Indians' }).click();

  await page.locator('[data-open-picker="orangeCap"]').click();
  await page.locator('#pickPickerSearch').fill('gill');
  await page.locator('[data-picker-value="Shubman Gill"]').click();

  await page.locator('[data-open-picker="uncappedMvp"]').click();
  await page.locator('[data-picker-team="PBKS"]').click();
  await page.locator('[data-picker-value="Prabhsimran Singh"]').click();

  await setHiddenPicks(page, {
    mostSixes: 'Shashank Singh',
    purpleCap: 'Prasidh Krishna',
    mostDots: 'Varun Chakaravarthy',
    mvp: 'Shubman Gill',
    fairPlay: 'Mumbai Indians',
    highestScoreTeam: 'Punjab Kings',
    striker: 'Prabhsimran Singh',
    bestBowlingFigures: 'Prasidh Krishna',
    bestBowlingStrikeRate: 'Varun Chakaravarthy',
    mostCatches: 'Riyan Parag',
    tableBottom: 'Delhi Capitals',
    leastMvp: 'Ravi Singh'
  });

  await page.locator('#submitPicksButton').click();
  await expect(page.locator('#duelControlsPanel')).toContainText('1 clash');
  await expect(page.locator('#breakdownTable')).toContainText('Clash');
  await expect(page.locator('#metricOverall')).toContainText('--');
  await expect(page.locator('#breakdownTable')).not.toContainText('KL Rahul');

  await page.locator('[data-open-picker="titleWinner"]').click();
  await page.getByRole('button', { name: 'Chennai Super Kings' }).click();
  await page.locator('#submitPicksButton').click();

  await expect(page.locator('#duelControlsPanel')).toContainText('Armed for Match');
  await expect(page.locator('#nextMatchMeta')).toContainText('Armed for Match');
  await expect(page.locator('#metricOverall')).toContainText('--');
  await expect(page.locator('#breakdownTable')).not.toContainText('Shubman Gill');
  await expect(page.locator('#duelDirectory')).toContainText(/Armed/i);
  await page.locator('#manageDrawer [data-close-drawer="manage"]').click();

  await page.getByRole('button', { name: 'Nerd Room' }).click();
  await expect(page.locator('#statsSummary')).toContainText('board');

  await page.getByRole('button', { name: 'Schedule' }).click();
  await expect(page.locator('#scheduleSummary')).toContainText('League-stage schedule');
  await expectLocatorCountAtLeast(page.locator('#scheduleTable tbody tr'), 10);

  expect(pageErrors).toEqual([]);
});

test('mini fantasy opens Match 14 early, shows future submit windows, and ranks saved users in the leaderboard', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.addInitScript(() => {
    window.__DUELS_TEST_NOW__ = '2026-04-06T08:00:00Z';
    window.DUELS_BACKEND_CONFIG = { enabled: false };
  });

  await page.route(/data\/live\.json(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(liveFixture)
    });
  });

  await page.goto('http://127.0.0.1:4173/index.html?room=sp-cup-2026');

  await expect(page.locator('#profileChipButton')).toBeVisible();
  await page.locator('#profileChipButton').click();
  await expect(page.locator('#profileDrawer')).toBeVisible();
  await page.locator('#authDisplayName').fill('Mini Bala');
  await page.locator('#authOwnerId').fill('mini-bala');
  await page.locator('#authForm button[type="submit"]').click();
  await page.locator('#profileDrawer [data-close-drawer="profile"]').click();

  await expect(page.locator('#leagueTitle')).toContainText('SP Cup 2026 Mini Fantasy');
  await expect(page.getByRole('button', { name: 'Duel', exact: true })).toBeVisible();
  await expect(page.locator('#browseDuelsButton')).toHaveCount(0);
  await expect(page.locator('#createDuelButton')).toHaveCount(0);
  await expect(page.locator('#manageDuelButton')).toHaveCount(0);
  await expect(page.locator('#profileChipButton')).toContainText('Mini Bala');
  await expectLocatorCountAtLeast(page.locator('#miniFantasyFixtures [data-mini-fixture]'), 1);
  await expect(page.locator('#miniFantasySection')).toContainText('How Mini Fantasy works');
  await expect(page.locator('#miniFantasyFixtures')).toContainText('Match 14');
  await expect(page.locator('#miniFantasyFixtures')).toContainText('Locks at');
  await expect(page.locator('#miniFantasyFixtures')).toContainText('Opens the day before');
  await expect(page.locator('#miniFantasyFixtures')).toContainText('opens next');
  await expect(page.locator('#miniFantasyBuilder')).toContainText('Match 14');

  await page.locator('[data-mini-pick="0"]').click();
  await expect(page.locator('#miniFantasyPickerModal')).toBeVisible();
  await page.locator('#miniFantasyPickerSearch').fill('duckett');
  await page.locator('[data-mini-picker-value="dc_ben-duckett"]').click();

  await page.locator('[data-mini-pick="1"]').click();
  await page.locator('#miniFantasyPickerSearch').fill('chameera');
  await page.locator('[data-mini-picker-value="dc_dushmantha-chameera"]').click();

  await page.locator('[data-mini-pick="2"]').click();
  await page.locator('[data-mini-picker-team="GT"]').click();
  await page.locator('#miniFantasyPickerSearch').fill('shahrukh');
  await page.locator('[data-mini-picker-value="gt_shahrukh-khan"]').click();

  await page.locator('[data-mini-pick="3"]').click();
  await page.locator('[data-mini-picker-team="GT"]').click();
  await page.locator('#miniFantasyPickerSearch').fill('kishore');
  await page.locator('[data-mini-picker-value="gt_sai-kishore"]').click();

  await page.locator('[data-mini-captain="0"]').click();
  await expect(page.locator('#miniFantasyBuilder')).toContainText('Lineup ready');
  await page.locator('#saveMiniFantasyButton').click();

  await expect(page.locator('#miniFantasyBuilder')).toContainText('team saved');
  await expect(page.locator('#miniFantasyMyEntries')).toContainText('Match 14');
  await expect(page.locator('#miniFantasyMyEntries')).toContainText('Captain locked');
  await expect(page.locator('#miniFantasyLeaderboard')).toContainText('Mini Bala');
  await expect(page.locator('#miniFantasyLeaderboard')).toContainText('@mini-bala');
  await expect(page.locator('#miniFantasyLeaderboard')).toContainText(/medal/i);

  expect(pageErrors).toEqual([]);
});
