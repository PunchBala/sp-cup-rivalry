import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const DEBUG_DIR = path.join(ROOT, 'debug');
const DATA_FILE = path.join(DATA_DIR, 'live.json');

const IPL_STATS_URL = 'https://www.iplt20.com/stats/2026';
const IPL_POINTS_URLS = [
  'https://www.iplt20.com/points-table/men',
  'https://www.espncricinfo.com/series/ipl-2026-1510719/points-table-standings',
  'https://sports.ndtv.com/ipl-2026/points-table'
];
const IPL_RESULTS_URLS = [
  'https://www.iplt20.com/matches/results',
  'https://www.iplt20.com/matches/results/2018'
];
const ESPN_CATCHES_URLS = [
  'https://www.espncricinfo.com/records/tournament/fielding-most-catches-career/indian-premier-league-17740',
  'https://www.espncricinfo.com/records/tournament/indian-premier-league-17740',
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
  ['v kohli', 'Virat Kohli'], ['virat kohli', 'Virat Kohli'],
  ['d brevis', 'Dewald Brevis'], ['dewald brevis', 'Dewald Brevis'],
  ['pd salt', 'Phil Salt'], ['p salt', 'Phil Salt'], ['phil salt', 'Phil Salt'],
  ['d padikkal', 'Devdutt Padikkal'], ['devdutt padikkal', 'Devdutt Padikkal'],
  ['h klaasen', 'Heinrich Klaasen'], ['heinrich klaasen', 'Heinrich Klaasen'],
  ['hs dubey', 'Harsh Dubey'], ['h s dubey', 'Harsh Dubey'], ['harsh dubey', 'Harsh Dubey'],
  ['t varma', 'Tilak Varma'], ['tilak varma', 'Tilak Varma'],
  ['r singh', 'Rinku Singh'], ['rinku singh', 'Rinku Singh'],
  ['v chakravarthy', 'Varun Chakravarthy'], ['varun chakravarthy', 'Varun Chakravarthy'],
  ['j bumrah', 'Jasprit Bumrah'], ['jasprit bumrah', 'Jasprit Bumrah'],
  ['y chahal', 'Yuzvendra Chahal'], ['yuzvendra chahal', 'Yuzvendra Chahal'],
  ['a sharma', 'Abhishek Sharma'], ['abhishek sharma', 'Abhishek Sharma'],
  ['i kishan', 'Ishan Kishan'], ['ishan kishan', 'Ishan Kishan'],
  ['s gill', 'Shubman Gill'], ['shubman gill', 'Shubman Gill'],
  ['kl rahul', 'KL Rahul'], ['k l rahul', 'KL Rahul'],
  ['r patidar', 'Rajat Patidar'], ['rajat patidar', 'Rajat Patidar'],
  ['r pant', 'Rishabh Pant'], ['rishabh pant', 'Rishabh Pant'],
  ['a singh', 'Arshdeep Singh'], ['arshdeep singh', 'Arshdeep Singh'],
  ['h patel', 'Harshal Patel'], ['harshal patel', 'Harshal Patel'],
  ['p krishna', 'Prasidh Krishna'], ['prasidh krishna', 'Prasidh Krishna'],
  ['t boult', 'Trent Boult'], ['trent boult', 'Trent Boult'],
  ['n pooran', 'Nicholas Pooran'], ['nicholas pooran', 'Nicholas Pooran'],
  ['s iyer', 'Shreyas Iyer'], ['shreyas iyer', 'Shreyas Iyer'],
  ['j hazlewood', 'Josh Hazlewood'], ['josh hazlewood', 'Josh Hazlewood'],
  ['a hosein', 'Akeal Hosein'], ['akeal hosein', 'Akeal Hosein'],
  ['k ahmed', 'Khaleel Ahmed'], ['khaleel ahmed', 'Khaleel Ahmed'],
  ['v suryavanshi', 'Vaibhav Suryavanshi'], ['vaibhav suryavanshi', 'Vaibhav Suryavanshi'],
  ['s samson', 'Sanju Samson'], ['sanju samson', 'Sanju Samson'],
  ['f allen', 'Finn Allen'], ['finn allen', 'Finn Allen'],
  ['p singh', 'Prabhsimran Singh'], ['prabhsimran singh', 'Prabhsimran Singh'],
  ['a nabi', 'Auqib Nabi'], ['auqib nabi', 'Auqib Nabi'],
  ['p veer', 'Prashant Veer'], ['prashant veer', 'Prashant Veer'],
  ['m dhoni', 'MS Dhoni'], ['ms dhoni', 'MS Dhoni'],
  ['c green', 'Cameron Green'], ['cameron green', 'Cameron Green']
]);

const STAT_TASKS = [
  { key: 'orangeCap', tab: 'Season', labels: ['Orange Cap'], entity: 'player', top5: true },
  { key: 'mostSixes', tab: 'Season', labels: ['Angel One Super Sixes Of The Season', 'Angel One Super Sixes of the Season'], entity: 'player', top5: true },
  { key: 'purpleCap', tab: 'Season', labels: ['Purple Cap'], entity: 'player', top5: true },
  { key: 'mostDots', tab: 'Season', labels: ['TATA IPL Green Dot Balls'], entity: 'player', top5: true },
  { key: 'mvp', tab: 'Awards', labels: ['Most Valuable Player', 'MVP', 'TATA IPL Most Valuable Player'], entity: 'player', top5: true },
  { key: 'fairPlay', tab: 'Awards', labels: ['Wonder Cement Fairplay Award', 'Wonder Cement FairPlay Award'], entity: 'team' },
  { key: 'striker', tab: 'Season', labels: ['Curvv Super Striker Of The Season', 'Curvv Super Striker of the Season'], entity: 'player' },
  { key: 'bestBowlingFigures', tab: 'Season', labels: ['Best Bowling Figures'], entity: 'player' },
  { key: 'bestBowlingStrikeRate', tab: 'Season', labels: ['Best Bowling Strike-Rate'], entity: 'player' }
];

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[()\[\]*]/g, ' ')
    .replace(/[^a-z0-9\s/-]/g, ' ')
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

function titleCase(value) {
  return value.split(' ').filter(Boolean).map((x) => x[0]?.toUpperCase() + x.slice(1)).join(' ');
}

function canonicalizeTeamName(value) {
  const key = normalize(String(value).replace(/\d+[/-]\d+.*$/, ''));
  return TEAM_ALIASES.get(key) || String(value).trim();
}

function canonicalizePlayerName(value) {
  const noTeam = String(value)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+\*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  const key = normalize(noTeam);
  return PLAYER_ALIASES.get(key) || titleCase(noTeam);
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
    await fs.writeFile(path.join(DEBUG_DIR, `${name}.txt`), await page.locator('body').innerText().catch(() => ''), 'utf8');
  } catch {
    // ignore
  }
}

async function acceptCookies(page) {
  for (const label of [/accept cookies/i, /accept/i, /allow all/i, /i agree/i, /^ok$/i]) {
    const button = page.getByRole('button', { name: label }).first();
    try {
      if (await button.isVisible({ timeout: 700 })) {
        await button.click({ timeout: 1500 });
        await page.waitForTimeout(500);
        return;
      }
    } catch {}
  }
}

async function gotoSettled(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1800);
  await acceptCookies(page);
  await page.waitForTimeout(1200);
}

async function clickIfVisible(locator) {
  try {
    if (await locator.isVisible({ timeout: 1200 })) {
      await locator.click({ timeout: 2500 });
      await locator.page().waitForTimeout(800);
      return true;
    }
  } catch {}
  return false;
}

async function clickTab(page, tabName) {
  const patterns = [
    page.getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') }).first(),
    page.getByRole('button', { name: new RegExp(`^${tabName}$`, 'i') }).first(),
    page.getByText(new RegExp(`^${tabName}$`, 'i')).first()
  ];
  for (const locator of patterns) {
    if (await clickIfVisible(locator)) return true;
  }
  const brute = await page.evaluate((wanted) => {
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const isVisible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 20 && r.height > 12 && s.display !== 'none' && s.visibility !== 'hidden';
    };
    for (const el of [...document.querySelectorAll('button, [role="button"], [role="tab"], a, div, span')]) {
      if (isVisible(el) && norm(el.innerText || el.textContent) === norm(wanted)) {
        el.click();
        return true;
      }
    }
    return false;
  }, tabName).catch(() => false);
  if (brute) await page.waitForTimeout(800);
  return brute;
}

async function clickLikelyMetricDropdown(page) {
  const ok = await page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 120 && r.height > 24 && s.display !== 'none' && s.visibility !== 'hidden' && r.y > 120 && r.y < 450;
    };
    const nodes = [...document.querySelectorAll('select, [role="combobox"], [aria-haspopup="listbox"], button, input, div')]
      .filter(visible)
      .map((el) => ({ el, x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y, text: (el.innerText || el.textContent || el.value || '').trim() }))
      .filter((x) => x.text.length <= 100)
      .sort((a, b) => a.y - b.y || a.x - b.x);
    const row = nodes.filter((x) => Math.abs(x.y - (nodes[0]?.y ?? 0)) < 30);
    const target = row[1] || nodes[1] || null;
    target?.el?.click?.();
    return !!target;
  }).catch(() => false);
  if (ok) await page.waitForTimeout(600);
  return ok;
}

async function selectMetricFromStatsPage(page, labels) {
  const selects = page.locator('select:visible');
  const selectCount = await selects.count().catch(() => 0);
  if (selectCount >= 2) {
    const metricSelect = selects.nth(1);
    const options = await metricSelect.locator('option').allTextContents().catch(() => []);
    for (const label of labels) {
      const found = options.find((opt) => normalize(opt).includes(normalize(label)));
      if (found) {
        await metricSelect.selectOption({ label: found });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1200);
        return true;
      }
    }
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await clickLikelyMetricDropdown(page);
    for (const label of labels) {
      const option = page.getByText(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).last();
      if (await clickIfVisible(option)) return true;
    }
    const brute = await page.evaluate((candidates) => {
      const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const wanted = candidates.map(norm);
      const isVisible = (el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 20 && r.height > 12 && s.display !== 'none' && s.visibility !== 'hidden';
      };
      for (const el of [...document.querySelectorAll('button, [role="button"], [role="option"], option, li, div, span, a')]) {
        const text = norm(el.innerText || el.textContent);
        if (!text || !isVisible(el)) continue;
        if (wanted.some((x) => text === x || text.includes(x))) {
          el.click();
          return true;
        }
      }
      return false;
    }, labels).catch(() => false);
    if (brute) {
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1200);
      return true;
    }
  }

  const bodyText = normalize(await page.locator('body').innerText().catch(() => ''));
  return labels.some((label) => bodyText.includes(normalize(label)));
}

async function extractVisibleTables(page) {
  const tables = await page.locator('table:visible').evaluateAll((nodes) => nodes.map((table) => ({
    headers: [...table.querySelectorAll('th')].map((n) => n.innerText.trim()).filter(Boolean),
    rows: [...table.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('th,td')].map((c) => c.innerText.trim()).filter(Boolean)).filter((r) => r.length)
  }))).catch(() => []);
  const roleTables = await page.locator('[role="table"]:visible, [role="grid"]:visible').evaluateAll((nodes) => nodes.map((table) => ({
    headers: [...table.querySelectorAll('[role="columnheader"]')].map((n) => n.innerText.trim()).filter(Boolean),
    rows: [...table.querySelectorAll('[role="row"]')].map((row) => [...row.querySelectorAll('[role="cell"], [role="rowheader"]')].map((c) => c.innerText.trim()).filter(Boolean)).filter((r) => r.length)
  }))).catch(() => []);
  return [...tables, ...roleTables].filter((x) => x.rows.length);
}

function pickBestTable(tables, entity) {
  return tables
    .map((table) => {
      const headers = table.headers.join(' | ').toLowerCase();
      let score = table.rows.length;
      if (entity === 'player' && /player/.test(headers)) score += 40;
      if (entity === 'team' && /team/.test(headers)) score += 40;
      if (/mat|inns|runs|wkts|ct|pts|nrr|sr|avg/.test(headers)) score += 10;
      return { score, table };
    })
    .sort((a, b) => b.score - a.score)[0]?.table ?? null;
}

function extractRankingFromRows(rows, entity) {
  const out = [];
  for (const row of rows) {
    let raw = row[0];
    if (/^\d+$/.test(raw) && row[1]) raw = row[1];
    const clean = entity === 'team' ? canonicalizeTeamName(raw) : canonicalizePlayerName(raw);
    if (!clean) continue;
    if (entity === 'team' && !TEAM_ALIASES.has(normalize(clean))) continue;
    out.push(clean);
  }
  return uniq(out);
}

function extractPlayerLinesFromText(text) {
  const lines = String(text || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const ranking = [];
  const skip = /^(player|pos|span|mat|inns?|runs|wkts|ct|max|avg|sr|bf|100|50|4s|6s|pts|nrr|won|lost|team|search by player name|all teams|all players|loading)$/i;
  for (const line of lines) {
    if (skip.test(line) || /^\d+$/.test(line)) continue;
    if (/\b(?:rcb|srh|mi|csk|gt|lsg|dc|pbks|rr|kkr)\b/i.test(line) || /^[A-Z]{1,3}\s[A-Za-z]/.test(line) || /^[A-Z][a-z]+\s[A-Za-z]/.test(line)) {
      const player = canonicalizePlayerName(line);
      if (player && player.length > 2 && !TEAM_ALIASES.has(normalize(player))) ranking.push(player);
    }
  }
  return uniq(ranking);
}

function extractTeamLinesFromText(text) {
  return uniq(
    String(text || '').split(/\n+/).map((x) => x.trim()).filter(Boolean).map((line) => TEAM_ALIASES.has(normalize(line)) ? canonicalizeTeamName(line) : null).filter(Boolean)
  );
}

function parseTeamScoresFromText(text) {
  const lines = String(text || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const hits = [];
  for (const line of lines) {
    const scoreMatch = line.match(/\b(\d{2,3})(?:\/(\d{1,2}))?\b/);
    if (!scoreMatch) continue;
    const score = Number(scoreMatch[1]);
    for (const [alias, team] of TEAM_ALIASES.entries()) {
      if (new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line)) {
        hits.push({ team, score });
      }
    }
  }
  return hits;
}

function extractCatchesRankingFromText(text) {
  const lines = String(text || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const ranking = [];
  let seen = false;
  for (const line of lines) {
    if (/player/i.test(line) && /ct/i.test(line)) { seen = true; continue; }
    if (!seen) continue;
    if (/^(span|mat|inns|ct|max|ct\/inn)$/i.test(line) || /^\d+$/.test(line)) continue;
    const player = canonicalizePlayerName(line);
    if (player && !TEAM_ALIASES.has(normalize(player))) ranking.push(player);
    if (ranking.length >= 20) break;
  }
  return uniq(ranking);
}

async function makePage(browser) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 2200 },
    locale: 'en-GB',
    timezoneId: 'Asia/Kolkata',
    extraHTTPHeaders: { 'Accept-Language': 'en-GB,en;q=0.9' }
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  return { context, page };
}

async function scrapeIplRanking(browser, task) {
  const { context, page } = await makePage(browser);
  try {
    await gotoSettled(page, IPL_STATS_URL);
    await clickTab(page, task.tab);
    const selected = await selectMetricFromStatsPage(page, task.labels);
    if (!selected) throw new Error(`Could not select metric: ${task.labels.join(' / ')}`);
    await page.waitForFunction(() => !/loading\.\.\./i.test(document.body.innerText), null, { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const tables = await extractVisibleTables(page);
    const table = pickBestTable(tables, task.entity);
    let ranking = table ? extractRankingFromRows(table.rows, task.entity) : [];
    if (!ranking.length) {
      const bodyText = await page.locator('body').innerText().catch(() => '');
      ranking = task.entity === 'team' ? extractTeamLinesFromText(bodyText) : extractPlayerLinesFromText(bodyText);
    }
    if (!ranking.length) throw new Error('No ranking extracted from stats page');
    return { ranking: task.top5 ? ranking.slice(0, 5) : ranking, extendedRanking: ranking };
  } catch (error) {
    await saveDebug(page, `fail_${task.key}`);
    throw error;
  } finally {
    await context.close();
  }
}

async function scrapePointsTable(browser) {
  let lastError = null;
  for (const url of IPL_POINTS_URLS) {
    const { context, page } = await makePage(browser);
    try {
      await gotoSettled(page, url);
      const tables = await extractVisibleTables(page);
      const table = pickBestTable(tables, 'team');
      let ranking = table ? extractRankingFromRows(table.rows, 'team') : [];
      if (ranking.length < 6) {
        const text = await page.locator('body').innerText().catch(() => '');
        ranking = extractTeamLinesFromText(text);
      }
      if (ranking.length < 6) throw new Error('No visible points table found');
      return { ranking, extendedRanking: ranking, playoffs: ranking.slice(0, 4), finalists: [], winner: null, source: url };
    } catch (error) {
      lastError = error;
      await saveDebug(page, `fail_points_${normalize(url).replace(/\s+/g, '_').slice(0, 80)}`);
    } finally {
      await context.close();
    }
  }
  throw lastError ?? new Error('Could not scrape points table');
}

async function clickLoadMore(page) {
  for (const label of [/load more/i, /show more/i, /more/i]) {
    if (await clickIfVisible(page.getByRole('button', { name: label }).first())) return true;
  }
  return false;
}

async function scrapeHighestTeamScores(browser) {
  let lastError = null;
  for (const url of IPL_RESULTS_URLS) {
    const { context, page } = await makePage(browser);
    try {
      await gotoSettled(page, url);
      for (let i = 0; i < 12; i += 1) {
        if (!(await clickLoadMore(page))) break;
      }
      const text = await page.locator('body').innerText().catch(() => '');
      const values = {};
      for (const hit of parseTeamScoresFromText(text)) values[hit.team] = Math.max(values[hit.team] || 0, hit.score);
      const ranking = Object.entries(values).sort((a, b) => b[1] - a[1]).map(([team]) => team);
      if (!ranking.length) throw new Error('Could not extract any team scores from results page');
      return { ranking, extendedRanking: ranking, values, source: url };
    } catch (error) {
      lastError = error;
      await saveDebug(page, `fail_results_${normalize(url).replace(/\s+/g, '_').slice(0, 80)}`);
    } finally {
      await context.close();
    }
  }
  throw lastError ?? new Error('Could not scrape results');
}

async function scrapeMostCatches(browser) {
  let lastError = null;
  for (const url of ESPN_CATCHES_URLS) {
    const { context, page } = await makePage(browser);
    try {
      await gotoSettled(page, url);
      const tables = await extractVisibleTables(page);
      const table = pickBestTable(tables, 'player');
      let ranking = table ? extractRankingFromRows(table.rows, 'player') : [];
      if (!ranking.length) {
        const text = await page.locator('body').innerText().catch(() => '');
        ranking = extractCatchesRankingFromText(text);
      }
      if (!ranking.length) throw new Error(`No visible catches table found at ${url}`);
      return { ranking, extendedRanking: ranking, source: url };
    } catch (error) {
      lastError = error;
      await saveDebug(page, `fail_catches_${normalize(url).replace(/\s+/g, '_').slice(0, 80)}`);
    } finally {
      await context.close();
    }
  }
  throw lastError ?? new Error('Could not scrape most catches from ESPN');
}

async function main() {
  await ensureDirs();
  const live = emptyLive();
  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
  const errors = [];

  try {
    for (const task of STAT_TASKS) {
      try {
        live[task.key] = await scrapeIplRanking(browser, task);
        live.scrapeReport[task.key] = { ok: true, count: live[task.key].extendedRanking.length, source: IPL_STATS_URL };
      } catch (error) {
        live.scrapeReport[task.key] = { ok: false, error: error.message, source: IPL_STATS_URL };
        errors.push(`${task.key}: ${error.message}`);
      }
    }

    try {
      live.titleWinner = await scrapePointsTable(browser);
      live.tableBottom = { ranking: [...live.titleWinner.extendedRanking], extendedRanking: [...live.titleWinner.extendedRanking] };
      live.scrapeReport.titleWinner = { ok: true, count: live.titleWinner.extendedRanking.length, source: live.titleWinner.source };
      live.scrapeReport.tableBottom = { ok: true, count: live.tableBottom.extendedRanking.length, source: live.titleWinner.source };
    } catch (error) {
      live.scrapeReport.titleWinner = { ok: false, error: error.message, source: IPL_POINTS_URLS[0] };
      live.scrapeReport.tableBottom = { ok: false, error: error.message, source: IPL_POINTS_URLS[0] };
      errors.push(`points-table: ${error.message}`);
    }

    try {
      live.highestScoreTeam = await scrapeHighestTeamScores(browser);
      live.scrapeReport.highestScoreTeam = { ok: true, count: live.highestScoreTeam.extendedRanking.length, source: live.highestScoreTeam.source };
    } catch (error) {
      live.scrapeReport.highestScoreTeam = { ok: false, error: error.message, source: IPL_RESULTS_URLS[0] };
      errors.push(`highestScoreTeam: ${error.message}`);
    }

    try {
      live.mostCatches = await scrapeMostCatches(browser);
      live.scrapeReport.mostCatches = { ok: true, count: live.mostCatches.extendedRanking.length, source: live.mostCatches.source };
    } catch (error) {
      live.scrapeReport.mostCatches = { ok: false, error: error.message, source: ESPN_CATCHES_URLS[0] };
      errors.push(`mostCatches: ${error.message}`);
    }
  } finally {
    await browser.close();
  }

  if (live.mvp.extendedRanking.length) {
    live.uncappedMvp = { ranking: [...live.mvp.extendedRanking], extendedRanking: [...live.mvp.extendedRanking] };
    live.leastMvp = { ranking: [...live.mvp.extendedRanking], extendedRanking: [...live.mvp.extendedRanking] };
  }

  live.fetchedAt = new Date().toISOString();
  live.scrapeStatus = errors.length ? `partial (${Object.values(live.scrapeReport).filter((x) => x?.ok).length} ok, ${errors.length} failed)` : 'ok';
  await fs.writeFile(DATA_FILE, JSON.stringify(live, null, 2), 'utf8');

  if (errors.length) {
    console.error('Worker completed with partial failures:');
    for (const error of errors) console.error(`- ${error}`);
  } else {
    console.log('Worker completed successfully.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
