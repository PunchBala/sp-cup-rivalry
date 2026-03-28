import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const DEBUG_DIR = path.join(ROOT, 'debug');
const DATA_FILE = path.join(DATA_DIR, 'live.json');

const IPL_STATS_URL = 'https://www.iplt20.com/stats/2026';
const IPL_POINTS_URL = 'https://www.iplt20.com/points-table/men';
const IPL_RESULTS_URL = 'https://www.iplt20.com/matches/results';
const ESPN_CATCHES_URLS = [
  'https://www.espncricinfo.com/records/tournament/fielding-most-catches-career/indian-premier-league-17740',
  'https://www.espncricinfo.com/series/ipl-2026-1510719/stats'
];

const TEAM_ALIASES = new Map([
  ['mi', 'Mumbai Indians'],
  ['mumbai indians', 'Mumbai Indians'],
  ['rcb', 'Royal Challengers Bengaluru'],
  ['royal challengers bengaluru', 'Royal Challengers Bengaluru'],
  ['royal challengers bangalore', 'Royal Challengers Bengaluru'],
  ['csk', 'Chennai Super Kings'],
  ['chennai super kings', 'Chennai Super Kings'],
  ['srh', 'Sunrisers Hyderabad'],
  ['sunrisers hyderabad', 'Sunrisers Hyderabad'],
  ['gt', 'Gujarat Titans'],
  ['gujarat titans', 'Gujarat Titans'],
  ['lsg', 'Lucknow Super Giants'],
  ['lucknow super giants', 'Lucknow Super Giants'],
  ['dc', 'Delhi Capitals'],
  ['delhi capitals', 'Delhi Capitals'],
  ['pbks', 'Punjab Kings'],
  ['punjab kings', 'Punjab Kings'],
  ['rr', 'Rajasthan Royals'],
  ['rajasthan royals', 'Rajasthan Royals'],
  ['kkr', 'Kolkata Knight Riders'],
  ['kolkata knight riders', 'Kolkata Knight Riders']
]);

const PLAYER_ALIASES = new Map([
  ['v kohli', 'Virat Kohli'],
  ['virat kohli', 'Virat Kohli'],
  ['d brevis', 'Dewald Brevis'],
  ['dewald brevis', 'Dewald Brevis'],
  ['pd salt', 'Phil Salt'],
  ['phil salt', 'Phil Salt'],
  ['p salt', 'Phil Salt'],
  ['d padikkal', 'Devdutt Padikkal'],
  ['devdutt padikkal', 'Devdutt Padikkal'],
  ['h klaasen', 'Heinrich Klaasen'],
  ['heinrich klaasen', 'Heinrich Klaasen'],
  ['hs dubey', 'Harsh Dubey'],
  ['harsh dubey', 'Harsh Dubey'],
  ['t varma', 'Tilak Varma'],
  ['tilak varma', 'Tilak Varma'],
  ['r singh', 'Rinku Singh'],
  ['rinku singh', 'Rinku Singh'],
  ['v chakravarthy', 'Varun Chakravarthy'],
  ['varun chakravarthy', 'Varun Chakravarthy'],
  ['j bumrah', 'Jasprit Bumrah'],
  ['jasprit bumrah', 'Jasprit Bumrah'],
  ['y chahal', 'Yuzvendra Chahal'],
  ['yuzvendra chahal', 'Yuzvendra Chahal'],
  ['a sharma', 'Abhishek Sharma'],
  ['abhishek sharma', 'Abhishek Sharma'],
  ['i kishan', 'Ishan Kishan'],
  ['ishan kishan', 'Ishan Kishan'],
  ['s gill', 'Shubman Gill'],
  ['shubman gill', 'Shubman Gill'],
  ['kl rahul', 'KL Rahul'],
  ['k l rahul', 'KL Rahul'],
  ['r patidar', 'Rajat Patidar'],
  ['rajat patidar', 'Rajat Patidar'],
  ['r pant', 'Rishabh Pant'],
  ['rishabh pant', 'Rishabh Pant'],
  ['a singh', 'Arshdeep Singh'],
  ['arshdeep singh', 'Arshdeep Singh'],
  ['h patel', 'Harshal Patel'],
  ['harshal patel', 'Harshal Patel'],
  ['p krishna', 'Prasidh Krishna'],
  ['prasidh krishna', 'Prasidh Krishna'],
  ['t boult', 'Trent Boult'],
  ['trent boult', 'Trent Boult'],
  ['n pooran', 'Nicholas Pooran'],
  ['nicholas pooran', 'Nicholas Pooran'],
  ['s iyer', 'Shreyas Iyer'],
  ['shreyas iyer', 'Shreyas Iyer'],
  ['j hazlewood', 'Josh Hazlewood'],
  ['josh hazlewood', 'Josh Hazlewood'],
  ['a hosein', 'Akeal Hosein'],
  ['akeal hosein', 'Akeal Hosein'],
  ['k ahmed', 'Khaleel Ahmed'],
  ['khaleel ahmed', 'Khaleel Ahmed'],
  ['v suryavanshi', 'Vaibhav Suryavanshi'],
  ['vaibhav suryavanshi', 'Vaibhav Suryavanshi'],
  ['s samson', 'Sanju Samson'],
  ['sanju samson', 'Sanju Samson'],
  ['f allen', 'Finn Allen'],
  ['finn allen', 'Finn Allen'],
  ['p singh', 'Prabhsimran Singh'],
  ['prabhsimran singh', 'Prabhsimran Singh'],
  ['a nabi', 'Auqib Nabi'],
  ['auqib nabi', 'Auqib Nabi'],
  ['p veer', 'Prashant Veer'],
  ['prashant veer', 'Prashant Veer'],
  ['m dhoni', 'MS Dhoni'],
  ['ms dhoni', 'MS Dhoni'],
  ['c green', 'Cameron Green'],
  ['cameron green', 'Cameron Green']
]);

const STAT_TASKS = [
  { key: 'orangeCap', tab: 'Season', labels: ['Orange Cap'], entity: 'player', top5: true },
  { key: 'mostSixes', tab: 'Season', labels: ['Angel One Super Sixes Of The Season', 'Angel One Super Sixes of the Season'], entity: 'player', top5: true },
  { key: 'purpleCap', tab: 'Season', labels: ['Purple Cap'], entity: 'player', top5: true },
  { key: 'mostDots', tab: 'Season', labels: ['TATA IPL Green Dot Balls'], entity: 'player', top5: true },
  { key: 'mvp', tab: 'Awards', labels: ['Most Valuable Player', 'MVP', 'TATA IPL Most Valuable Player'], entity: 'player', top5: true },
  { key: 'fairPlay', tab: 'Awards', labels: ['Wonder Cement Fairplay Award', 'Wonder Cement FairPlay Award'], entity: 'team', top5: false },
  { key: 'striker', tab: 'Season', labels: ['Curvv Super Striker Of The Season', 'Curvv Super Striker of the Season'], entity: 'player', top5: false },
  { key: 'bestBowlingFigures', tab: 'Season', labels: ['Best Bowling Figures'], entity: 'player', top5: false },
  { key: 'bestBowlingStrikeRate', tab: 'Season', labels: ['Best Bowling Strike-Rate'], entity: 'player', top5: false, rejectLabels: ['(Innings)'] }
];

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[()\[\]*]/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniq(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function canonicalizeTeamName(value) {
  const cleaned = normalize(String(value).replace(/\d+[/-]\d+.*$/, '').trim());
  if (TEAM_ALIASES.has(cleaned)) return TEAM_ALIASES.get(cleaned);
  return String(value).trim();
}

function titleCase(value) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function canonicalizePlayerName(value) {
  const noTeam = String(value)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+\*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  const cleaned = normalize(noTeam);
  if (PLAYER_ALIASES.has(cleaned)) return PLAYER_ALIASES.get(cleaned);
  return titleCase(noTeam.replace(/\s+/g, ' ').trim());
}

function emptyLive() {
  return {
    season: 2026,
    provider: 'data/live.json',
    scrapeStatus: 'worker started',
    fetchedAt: null,
    scrapeReport: {},
    titleWinner: { winner: null, finalists: [], playoffs: [], ranking: [], extendedRanking: [] },
    orangeCap: { ranking: [], extendedRanking: [] },
    mostSixes: { ranking: [], extendedRanking: [] },
    purpleCap: { ranking: [], extendedRanking: [] },
    mostDots: { ranking: [], extendedRanking: [] },
    mvp: { ranking: [], extendedRanking: [] },
    uncappedMvp: { ranking: [], extendedRanking: [] },
    fairPlay: { ranking: [], extendedRanking: [] },
    highestScoreTeam: { ranking: [], extendedRanking: [], values: {} },
    striker: { ranking: [], extendedRanking: [] },
    bestBowlingFigures: { ranking: [], extendedRanking: [] },
    bestBowlingStrikeRate: { ranking: [], extendedRanking: [] },
    mostCatches: { ranking: [], extendedRanking: [] },
    tableBottom: { ranking: [], extendedRanking: [] },
    leastMvp: { ranking: [], extendedRanking: [] }
  };
}

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(DEBUG_DIR, { recursive: true });
}

async function saveDebug(page, name) {
  try {
    await page.screenshot({ path: path.join(DEBUG_DIR, `${name}.png`), fullPage: true });
    await fs.writeFile(path.join(DEBUG_DIR, `${name}.html`), await page.content(), 'utf8');
  } catch {
    // ignore debug-write failures
  }
}

async function acceptCookies(page) {
  const labels = [/accept cookies/i, /accept/i, /allow all/i, /i agree/i, /ok/i];
  for (const label of labels) {
    const button = page.getByRole('button', { name: label }).first();
    try {
      if (await button.isVisible({ timeout: 700 })) {
        await button.click({ timeout: 1500 });
        await page.waitForTimeout(500);
        return;
      }
    } catch {
      // keep trying
    }
  }
}

async function gotoSettled(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await acceptCookies(page);
  await page.waitForTimeout(800);
}

async function clickByText(page, candidates) {
  for (const candidate of candidates) {
    const locator = page.getByText(new RegExp(`^\\s*${candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')).first();
    try {
      if (await locator.isVisible({ timeout: 1200 })) {
        await locator.click({ timeout: 2500 });
        await page.waitForTimeout(800);
        return true;
      }
    } catch {
      // continue
    }
  }
  return false;
}

async function clickTab(page, tabName) {
  const exact = [tabName];
  const roles = [
    page.getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') }).first(),
    page.getByRole('button', { name: new RegExp(`^${tabName}$`, 'i') }).first(),
    page.locator('text=/^' + tabName + '$/i').first()
  ];
  for (const locator of roles) {
    try {
      if (await locator.isVisible({ timeout: 1200 })) {
        await locator.click({ timeout: 2500 });
        await page.waitForTimeout(1000);
        return true;
      }
    } catch {
      // keep trying
    }
  }
  return clickByText(page, exact);
}

async function selectMetricFromStatsPage(page, labels) {
  const visibleSelects = page.locator('select:visible');
  const selectCount = await visibleSelects.count();
  if (selectCount >= 2) {
    const metricSelect = visibleSelects.nth(1);
    const optionLabels = await metricSelect.locator('option').allTextContents().catch(() => []);
    for (const candidate of labels) {
      const found = optionLabels.find((option) => normalize(option).includes(normalize(candidate)));
      if (found) {
        await metricSelect.selectOption({ label: found });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1000);
        return found;
      }
    }
  }

  const triggerSelectors = [
    '[role="combobox"]:visible',
    '[aria-haspopup="listbox"]:visible',
    'button:visible',
    'input[readonly]:visible'
  ];

  for (const selector of triggerSelectors) {
    const triggers = page.locator(`main ${selector}`);
    const count = Math.min(await triggers.count().catch(() => 0), 12);
    for (const index of [1, 0, 2, 3, 4, 5]) {
      if (index >= count) continue;
      const trigger = triggers.nth(index);
      try {
        await trigger.click({ timeout: 2000 });
        await page.waitForTimeout(400);
      } catch {
        continue;
      }
      for (const candidate of labels) {
        const option = page.getByText(new RegExp(candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).last();
        try {
          if (await option.isVisible({ timeout: 1200 })) {
            await option.click({ timeout: 2500 });
            await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
            await page.waitForTimeout(1000);
            return candidate;
          }
        } catch {
          // try next option
        }
      }
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  throw new Error(`Could not select metric: ${labels.join(' / ')}`);
}

async function extractVisibleTables(page) {
  const tables = await page.locator('table:visible').evaluateAll((nodes) => nodes.map((table) => ({
    headers: [...table.querySelectorAll('th')].map((node) => node.innerText.trim()).filter(Boolean),
    rows: [...table.querySelectorAll('tbody tr')].map((row) =>
      [...row.querySelectorAll('th,td')].map((cell) => cell.innerText.trim()).filter(Boolean)
    ).filter((row) => row.length)
  }))).catch(() => []);

  const roleTables = await page.locator('[role="table"]:visible, [role="grid"]:visible').evaluateAll((nodes) => nodes.map((table) => ({
    headers: [...table.querySelectorAll('[role="columnheader"]')].map((node) => node.innerText.trim()).filter(Boolean),
    rows: [...table.querySelectorAll('[role="row"]')].map((row) =>
      [...row.querySelectorAll('[role="cell"], [role="rowheader"]')].map((cell) => cell.innerText.trim()).filter(Boolean)
    ).filter((row) => row.length)
  }))).catch(() => []);

  return [...tables, ...roleTables].filter((table) => table.rows.length);
}

function pickBestTable(tables, entity) {
  const scored = tables
    .map((table) => {
      const headerBlob = table.headers.join(' | ').toLowerCase();
      let score = table.rows.length;
      if (entity === 'player' && /player/.test(headerBlob)) score += 50;
      if (entity === 'team' && /team/.test(headerBlob)) score += 50;
      if (/ct|wkts|runs|avg|sr|pts|mat|inns/.test(headerBlob)) score += 10;
      return { score, table };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.table ?? null;
}

function extractRankingFromRows(rows, entity) {
  const output = [];
  for (const row of rows) {
    if (!row.length) continue;
    let raw = row[0];
    if (/^\d+$/.test(raw) && row[1]) raw = row[1];
    const clean = entity === 'team' ? canonicalizeTeamName(raw) : canonicalizePlayerName(raw);
    if (!clean) continue;
    if (entity === 'team' && !TEAM_ALIASES.has(normalize(clean))) continue;
    output.push(clean);
  }
  return uniq(output);
}

async function scrapeIplRanking(browser, task) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
  page.setDefaultTimeout(15000);
  try {
    await gotoSettled(page, IPL_STATS_URL);
    await clickTab(page, task.tab);
    await selectMetricFromStatsPage(page, task.labels);
    await page.waitForFunction(() => !/loading/i.test(document.body.innerText), null, { timeout: 10000 }).catch(() => {});

    const tables = await extractVisibleTables(page);
    const table = pickBestTable(tables, task.entity);
    if (!table) throw new Error('No visible table found on stats page');

    let ranking = extractRankingFromRows(table.rows, task.entity);
    if (task.rejectLabels?.length) {
      ranking = ranking.filter((name) => !task.rejectLabels.some((bad) => normalize(name).includes(normalize(bad))));
    }
    if (!ranking.length) throw new Error('Table extracted but ranking was empty');

    return {
      ranking: task.top5 ? ranking.slice(0, 5) : ranking,
      extendedRanking: ranking
    };
  } catch (error) {
    await saveDebug(page, `fail_${task.key}`);
    throw error;
  } finally {
    await page.close();
  }
}

async function scrapePointsTable(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
  page.setDefaultTimeout(15000);
  try {
    await gotoSettled(page, IPL_POINTS_URL);
    const tables = await extractVisibleTables(page);
    const table = pickBestTable(tables, 'team');
    if (!table) throw new Error('No visible points table found');

    const ranking = uniq(table.rows.map((row) => {
      const match = row.find((cell) => TEAM_ALIASES.has(normalize(cell)));
      return match ? canonicalizeTeamName(match) : null;
    }).filter(Boolean));

    if (ranking.length < 6) throw new Error('Points table scrape looked incomplete');

    return {
      ranking,
      extendedRanking: ranking,
      playoffs: ranking.slice(0, 4),
      finalists: [],
      winner: null
    };
  } catch (error) {
    await saveDebug(page, 'fail_points_table');
    throw error;
  } finally {
    await page.close();
  }
}

async function clickLoadMore(page) {
  const labels = [/load more/i, /show more/i, /more/i];
  for (const label of labels) {
    const button = page.getByRole('button', { name: label }).first();
    try {
      if (await button.isVisible({ timeout: 800 })) {
        await button.click({ timeout: 2500 });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(900);
        return true;
      }
    } catch {
      // keep trying
    }
  }
  return false;
}

function parseTeamScoresFromText(text) {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const matches = [];
  for (const line of lines) {
    const scoreMatch = line.match(/\b(\d{2,3})(?:\/(\d{1,2}))?\b/);
    if (!scoreMatch) continue;
    const score = Number(scoreMatch[1]);
    for (const [alias, team] of TEAM_ALIASES.entries()) {
      const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(line)) {
        matches.push({ team, score });
      }
    }
  }
  return matches;
}

async function scrapeHighestTeamScores(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 2600 } });
  page.setDefaultTimeout(15000);
  try {
    await gotoSettled(page, IPL_RESULTS_URL);
    for (let i = 0; i < 12; i += 1) {
      const clicked = await clickLoadMore(page);
      if (!clicked) break;
    }

    const blocks = await page.locator('main *:visible').evaluateAll((nodes) => {
      return [...new Set(nodes.map((node) => node.innerText.trim()).filter((text) => text && text.length >= 15 && text.length <= 350))];
    }).catch(() => []);

    const values = {};
    for (const block of blocks) {
      for (const hit of parseTeamScoresFromText(block)) {
        values[hit.team] = Math.max(values[hit.team] || 0, hit.score);
      }
    }

    const ranking = Object.entries(values)
      .sort((a, b) => b[1] - a[1])
      .map(([team]) => team);

    if (!ranking.length) throw new Error('Could not extract any team scores from results page');

    return {
      ranking,
      extendedRanking: ranking,
      values
    };
  } catch (error) {
    await saveDebug(page, 'fail_results');
    throw error;
  } finally {
    await page.close();
  }
}

async function scrapeMostCatches(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
  page.setDefaultTimeout(15000);
  let lastError = null;
  try {
    for (const url of ESPN_CATCHES_URLS) {
      try {
        await gotoSettled(page, url);
        const tables = await extractVisibleTables(page);
        const table = pickBestTable(tables, 'player');
        if (!table) throw new Error(`No visible catches table found at ${url}`);
        const ranking = extractRankingFromRows(table.rows, 'player');
        if (!ranking.length) throw new Error(`Table found but ranking empty at ${url}`);
        return {
          ranking,
          extendedRanking: ranking
        };
      } catch (error) {
        lastError = error;
        await saveDebug(page, `fail_catches_${normalize(url).replace(/\s+/g, '_').slice(0, 80)}`);
      }
    }
    throw lastError ?? new Error('Could not scrape most catches from ESPN');
  } finally {
    await page.close();
  }
}

async function main() {
  await ensureDirs();
  const live = emptyLive();
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  try {
    for (const task of STAT_TASKS) {
      try {
        live[task.key] = await scrapeIplRanking(browser, task);
        live.scrapeReport[task.key] = { ok: true, count: live[task.key].extendedRanking?.length || live[task.key].ranking?.length || 0, source: IPL_STATS_URL };
      } catch (error) {
        live.scrapeReport[task.key] = { ok: false, error: error.message, source: IPL_STATS_URL };
        errors.push(`${task.key}: ${error.message}`);
      }
    }

    try {
      live.titleWinner = await scrapePointsTable(browser);
      live.tableBottom = { ranking: [...live.titleWinner.extendedRanking], extendedRanking: [...live.titleWinner.extendedRanking] };
      live.scrapeReport.titleWinner = { ok: true, count: live.titleWinner.extendedRanking.length, source: IPL_POINTS_URL };
      live.scrapeReport.tableBottom = { ok: true, count: live.tableBottom.extendedRanking.length, source: IPL_POINTS_URL };
    } catch (error) {
      live.scrapeReport.titleWinner = { ok: false, error: error.message, source: IPL_POINTS_URL };
      live.scrapeReport.tableBottom = { ok: false, error: error.message, source: IPL_POINTS_URL };
      errors.push(`points-table: ${error.message}`);
    }

    try {
      live.highestScoreTeam = await scrapeHighestTeamScores(browser);
      live.scrapeReport.highestScoreTeam = { ok: true, count: live.highestScoreTeam.extendedRanking.length, source: IPL_RESULTS_URL };
    } catch (error) {
      live.scrapeReport.highestScoreTeam = { ok: false, error: error.message, source: IPL_RESULTS_URL };
      errors.push(`highestScoreTeam: ${error.message}`);
    }

    try {
      live.mostCatches = await scrapeMostCatches(browser);
      live.scrapeReport.mostCatches = { ok: true, count: live.mostCatches.extendedRanking.length, source: ESPN_CATCHES_URLS[0] };
    } catch (error) {
      live.scrapeReport.mostCatches = { ok: false, error: error.message, source: ESPN_CATCHES_URLS[0] };
      errors.push(`mostCatches: ${error.message}`);
    }
  } finally {
    await browser.close();
  }

  if (live.mvp.extendedRanking?.length) {
    live.uncappedMvp = { ranking: [...live.mvp.extendedRanking], extendedRanking: [...live.mvp.extendedRanking] };
    live.leastMvp = { ranking: [...live.mvp.extendedRanking], extendedRanking: [...live.mvp.extendedRanking] };
  }

  live.fetchedAt = new Date().toISOString();
  live.scrapeStatus = errors.length ? `partial (${Object.values(live.scrapeReport).filter((item) => item?.ok).length} ok, ${errors.length} failed)` : 'ok';

  await fs.writeFile(DATA_FILE, JSON.stringify(live, null, 2), 'utf8');

  if (errors.length) {
    console.error('Worker completed with partial failures:');
    for (const error of errors) console.error(`- ${error}`);
  } else {
    console.log('Worker completed successfully.');
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
