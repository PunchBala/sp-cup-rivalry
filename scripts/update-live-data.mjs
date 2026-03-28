import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const DEBUG_DIR = path.join(ROOT, 'debug');
const DATA_FILE = path.join(DATA_DIR, 'live.json');
const USER_DATA_DIR = path.join(ROOT, '.chrome-profile');

const IPL_STATS_URL = 'https://www.iplt20.com/stats/2026';
const IPL_POINTS_URLS = [
  'https://www.iplt20.com/points-table/men'
];
const IPL_RESULTS_URLS = [
  'https://www.iplt20.com/matches/results'
];
const ESPN_CATCHES_URLS = [
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

const TEAM_CODES = new Set(['MI','RCB','CSK','SRH','GT','LSG','DC','PBKS','RR','KKR']);

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
  { key: 'orangeCap', tab: 'Season', group: 'BATTERS', labels: ['Orange Cap'], entity: 'player', top5: true },
  { key: 'mostSixes', tab: 'Season', group: 'BATTERS', labels: ['Angel One Super Sixes Of The Season', 'Angel One Super Sixes of the Season'], entity: 'player', top5: true },
  { key: 'purpleCap', tab: 'Season', group: 'BOWLERS', labels: ['Purple Cap'], entity: 'player', top5: true },
  { key: 'mostDots', tab: 'Season', group: 'BOWLERS', labels: ['TATA IPL Green Dot Balls'], entity: 'player', top5: true },
  { key: 'mvp', tab: 'Awards', labels: ['Most Valuable Player', 'MVP', 'TATA IPL Most Valuable Player'], entity: 'player', top5: true },
  { key: 'fairPlay', tab: 'Awards', labels: ['Wonder Cement Fairplay Award', 'Wonder Cement FairPlay Award'], entity: 'team' },
  { key: 'striker', tab: 'Season', group: 'BATTERS', labels: ['Curvv Super Striker Of The Season', 'Curvv Super Striker of the Season'], entity: 'player' },
  { key: 'bestBowlingFigures', tab: 'Season', group: 'BOWLERS', labels: ['Best Bowling Figures'], entity: 'player' },
  { key: 'bestBowlingStrikeRate', tab: 'Season', group: 'BOWLERS', labels: ['Best Bowling Strike-Rate'], entity: 'player' }
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

function cleanPlayerText(value) {
  let s = String(value || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+\*$/, '')
    .replace(/\bPOS\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const parts = s.split(' ');
  if (parts.length && TEAM_CODES.has(parts[parts.length - 1].toUpperCase())) {
    parts.pop();
    s = parts.join(' ');
  }
  return s.trim();
}

function canonicalizeTeamName(value) {
  const key = normalize(String(value).replace(/\d+[/-]\d+.*$/, ''));
  return TEAM_ALIASES.get(key) || String(value).trim();
}

function canonicalizePlayerName(value) {
  const noTeam = cleanPlayerText(value);
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
  await fs.mkdir(USER_DATA_DIR, { recursive: true });
}

async function saveDebug(page, name) {
  try {
    await page.screenshot({ path: path.join(DEBUG_DIR, `${name}.png`), fullPage: true });
    await fs.writeFile(path.join(DEBUG_DIR, `${name}.html`), await page.content(), 'utf8');
    await fs.writeFile(path.join(DEBUG_DIR, `${name}.txt`), await page.locator('body').innerText().catch(() => ''), 'utf8');
  } catch {}
}

async function acceptCookies(page) {
  for (const label of [/accept cookies/i, /accept/i, /allow all/i, /i agree/i, /^ok$/i]) {
    try {
      const button = page.getByRole('button', { name: label }).first();
      if (await button.isVisible({ timeout: 600 })) {
        await button.click({ timeout: 1200 });
        await page.waitForTimeout(500);
        return;
      }
    } catch {}
  }
}

async function isAccessDenied(page) {
  const text = normalize(await page.locator('body').innerText().catch(() => ''));
  return text.includes('access denied') || text.includes("you don't have permission to access");
}

async function gotoSettled(page, url, debugName) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await acceptCookies(page);
  await page.waitForTimeout(800);
  if (await isAccessDenied(page)) {
    await saveDebug(page, debugName);
    throw new Error(`Access denied at ${url}`);
  }
}

async function clickTextInPage(page, texts, exact = false) {
  const list = Array.isArray(texts) ? texts : [texts];
  for (const txt of list) {
    try {
      const rx = new RegExp(txt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const locators = [
        page.getByRole('button', { name: rx }).first(),
        page.getByRole('tab', { name: rx }).first(),
        page.getByRole('option', { name: rx }).first(),
        page.getByText(rx).first()
      ];
      for (const loc of locators) {
        if (await loc.isVisible({ timeout: 700 })) {
          await loc.click({ timeout: 1500 });
          await page.waitForTimeout(500);
          return true;
        }
      }
    } catch {}
  }

  const ok = await page.evaluate(({ texts, exact }) => {
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const wants = texts.map(norm);
    const isVisible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 20 && r.height > 12 && s.display !== 'none' && s.visibility !== 'hidden';
    };
    const all = [...document.querySelectorAll('button, [role="button"], [role="tab"], [role="option"], li, a, span, div, label, input')];
    for (const el of all) {
      if (!isVisible(el)) continue;
      const text = norm(el.innerText || el.textContent || el.value || '');
      if (!text) continue;
      if (wants.some((w) => exact ? text === w : text === w || text.includes(w))) {
        el.click?.();
        return true;
      }
    }
    return false;
  }, { texts: list, exact }).catch(() => false);
  if (ok) await page.waitForTimeout(600);
  return ok;
}

async function clickMetricControl(page) {
  const opened = await page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 140 && r.height > 24 && s.display !== 'none' && s.visibility !== 'hidden' && r.y > 180 && r.y < 420;
    };
    const nodes = [...document.querySelectorAll('select, [role="combobox"], [aria-haspopup="listbox"], button, div, input')]
      .filter(visible)
      .map((el) => ({
        el,
        x: el.getBoundingClientRect().x,
        y: el.getBoundingClientRect().y,
        w: el.getBoundingClientRect().width,
        text: (el.innerText || el.textContent || el.value || '').trim()
      }))
      .filter((n) => n.w >= 150 && n.w <= 420)
      .sort((a, b) => a.y - b.y || a.x - b.x);

    const rowY = nodes[0]?.y ?? 0;
    const row = nodes.filter((n) => Math.abs(n.y - rowY) < 35).sort((a, b) => a.x - b.x);
    const target = row[1] || nodes[1];
    if (!target) return false;
    target.el.click?.();
    return true;
  }).catch(() => false);

  if (opened) await page.waitForTimeout(800);
  return opened;
}

async function chooseFromOpenDropdown(page, labels) {
  let clicked = await clickTextInPage(page, labels, false);
  if (clicked) return true;

  for (let i = 0; i < 10; i += 1) {
    await page.evaluate(() => {
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 160 && r.height > 100 && s.display !== 'none' && s.visibility !== 'hidden';
      };
      const boxes = [...document.querySelectorAll('div, ul')]
        .filter(visible)
        .filter((el) => {
          const s = getComputedStyle(el);
          return /(auto|scroll)/.test(s.overflowY) || el.scrollHeight > el.clientHeight + 10;
        })
        .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
      const target = boxes[0];
      if (target) target.scrollTop += 220;
    }).catch(() => {});
    await page.waitForTimeout(350);
    clicked = await clickTextInPage(page, labels, false);
    if (clicked) return true;
  }
  return false;
}

async function chooseStatsMetric(page, task) {
  await page.locator('body').evaluate(() => window.scrollTo(0, 350)).catch(() => {});
  await page.waitForTimeout(300);

  const tabOk = await clickTextInPage(page, task.tab, true);
  if (!tabOk) throw new Error(`Could not click tab: ${task.tab}`);
  await page.waitForTimeout(600);

  let controlOpened = await clickMetricControl(page);
  if (!controlOpened) throw new Error('Could not open metric dropdown');

  if (task.group) {
    const groupOk = await clickTextInPage(page, task.group, true);
    if (groupOk) {
      await page.waitForTimeout(400);
    } else {
      // reopen dropdown if it closed before group click
      await clickMetricControl(page);
      const retryGroup = await clickTextInPage(page, task.group, true);
      if (!retryGroup) throw new Error(`Could not switch group: ${task.group}`);
      await page.waitForTimeout(400);
    }
  }

  // reopen after group switch if needed
  await clickMetricControl(page).catch(() => {});
  const optionOk = await chooseFromOpenDropdown(page, task.labels);
  if (!optionOk) throw new Error(`Could not select metric: ${task.labels.join(' / ')}`);

  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function extractVisibleTables(page) {
  const tables = await page.locator('table:visible').evaluateAll((nodes) => nodes.map((table) => ({
    headers: [...table.querySelectorAll('th')].map((n) => n.innerText.trim()).filter(Boolean),
    rows: [...table.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('th,td')].map((c) => c.innerText.trim()).filter(Boolean)).filter((r) => r.length)
  }))).catch(() => []);
  return tables.filter((x) => x.rows.length);
}

function pickBestTable(tables, entity) {
  return tables
    .map((table) => {
      const headers = table.headers.join(' | ').toLowerCase();
      let score = table.rows.length;
      if (entity === 'player' && /player/.test(headers)) score += 40;
      if (entity === 'team' && /team/.test(headers)) score += 40;
      if (/mat|inns|runs|wkts|ct|pts|nrr|sr|avg|bf|6s|4s/.test(headers)) score += 10;
      return { score, table };
    })
    .sort((a, b) => b.score - a.score)[0]?.table ?? null;
}

function extractRankingFromRows(rows, entity) {
  const out = [];
  for (const row of rows) {
    let raw = row[0];
    if (/^\d+$/.test(raw) && row[1]) raw = row[1];
    if (/^pos$/i.test(raw)) continue;
    const clean = entity === 'team' ? canonicalizeTeamName(raw) : canonicalizePlayerName(raw);
    if (!clean) continue;
    if (entity === 'team' && !TEAM_ALIASES.has(normalize(clean))) continue;
    out.push(clean);
  }
  return uniq(out);
}

function extractTeamLinesFromText(text) {
  const lines = String(text || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
  return uniq(lines.map((line) => TEAM_ALIASES.has(normalize(line)) ? canonicalizeTeamName(line) : null).filter(Boolean));
}

function extractPlayerLinesFromText(text) {
  const lines = String(text || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const ranking = [];
  for (const line of lines) {
    const player = canonicalizePlayerName(line);
    if (player && player.length > 2 && !TEAM_ALIASES.has(normalize(player)) && !/^pos$/i.test(player)) ranking.push(player);
  }
  return uniq(ranking);
}

function parseTeamScoresFromText(text) {
  const lines = String(text || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const values = {};
  for (const line of lines) {
    const scoreMatch = line.match(/\b(\d{2,3})(?:\/\d{1,2})?\b/);
    if (!scoreMatch) continue;
    const score = Number(scoreMatch[1]);
    for (const [alias, team] of TEAM_ALIASES.entries()) {
      if (new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line)) {
        values[team] = Math.max(values[team] || 0, score);
      }
    }
  }
  return values;
}

function extractCatchesRankingFromText(text) {
  const lines = String(text || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const ranking = [];
  let seen = false;
  for (const line of lines) {
    if (/most catches/i.test(line)) { seen = true; continue; }
    if (!seen) continue;
    if (/player|span|mat|inns|ct|max|ct\/inn/i.test(line) || /^\d+$/.test(line)) continue;
    const player = canonicalizePlayerName(line);
    if (player && !TEAM_ALIASES.has(normalize(player))) ranking.push(player);
    if (ranking.length >= 20) break;
  }
  return uniq(ranking);
}

async function createContext() {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1440, height: 2200 },
    locale: 'en-GB',
    timezoneId: 'Asia/Kolkata',
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'en-GB,en;q=0.9',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0'
    },
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage']
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = window.chrome || { runtime: {} };
    Object.defineProperty(navigator, 'languages', { get: () => ['en-GB', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });

  return context;
}

async function makePage(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  return page;
}

async function scrapeIplRanking(context, task) {
  const page = await makePage(context);
  try {
    await gotoSettled(page, IPL_STATS_URL, `blocked_${task.key}`);
    await chooseStatsMetric(page, task);

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
    await page.close().catch(() => {});
  }
}

async function scrapePointsTable(context) {
  let lastError = null;
  for (const url of IPL_POINTS_URLS) {
    const page = await makePage(context);
    try {
      await gotoSettled(page, url, `blocked_points_${normalize(url).replace(/\s+/g, '_').slice(0, 80)}`);
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
      await page.close().catch(() => {});
    }
  }
  throw lastError ?? new Error('Could not scrape points table');
}

async function scrapeHighestTeamScores(context) {
  let lastError = null;
  for (const url of IPL_RESULTS_URLS) {
    const page = await makePage(context);
    try {
      await gotoSettled(page, url, `blocked_results_${normalize(url).replace(/\s+/g, '_').slice(0, 80)}`);
      for (let i = 0; i < 10; i += 1) {
        const more = await clickTextInPage(page, ['Load More', 'Show More', 'More'], false);
        if (!more) break;
      }
      const text = await page.locator('body').innerText().catch(() => '');
      const values = parseTeamScoresFromText(text);
      const ranking = Object.entries(values).sort((a, b) => b[1] - a[1]).map(([team]) => team);
      if (!ranking.length) throw new Error('Could not extract any team scores from results page');
      return { ranking, extendedRanking: ranking, values, source: url };
    } catch (error) {
      lastError = error;
      await saveDebug(page, `fail_results_${normalize(url).replace(/\s+/g, '_').slice(0, 80)}`);
    } finally {
      await page.close().catch(() => {});
    }
  }
  throw lastError ?? new Error('Could not scrape results');
}

async function scrapeMostCatches(context) {
  let lastError = null;
  for (const url of ESPN_CATCHES_URLS) {
    const page = await makePage(context);
    try {
      await gotoSettled(page, url, `blocked_catches_${normalize(url).replace(/\s+/g, '_').slice(0, 80)}`);
      const text = await page.locator('body').innerText().catch(() => '');
      let ranking = extractCatchesRankingFromText(text);
      if (!ranking.length) {
        const tables = await extractVisibleTables(page);
        const table = pickBestTable(tables, 'player');
        ranking = table ? extractRankingFromRows(table.rows, 'player') : [];
      }
      if (!ranking.length) throw new Error(`No visible catches table found at ${url}`);
      return { ranking, extendedRanking: ranking, source: url };
    } catch (error) {
      lastError = error;
      await saveDebug(page, `fail_catches_${normalize(url).replace(/\s+/g, '_').slice(0, 80)}`);
    } finally {
      await page.close().catch(() => {});
    }
  }
  throw lastError ?? new Error('Could not scrape most catches from ESPN');
}

function majorCategoryCount(live) {
  return [
    live.orangeCap.extendedRanking.length,
    live.mostSixes.extendedRanking.length,
    live.purpleCap.extendedRanking.length,
    live.mostDots.extendedRanking.length,
    live.mvp.extendedRanking.length,
    live.highestScoreTeam.extendedRanking.length,
    live.mostCatches.extendedRanking.length,
    live.titleWinner.extendedRanking.length
  ].filter((x) => x > 0).length;
}

async function main() {
  await ensureDirs();
  const live = emptyLive();
  const context = await createContext();
  const errors = [];

  try {
    for (const task of STAT_TASKS) {
      try {
        live[task.key] = await scrapeIplRanking(context, task);
        live.scrapeReport[task.key] = { ok: true, count: live[task.key].extendedRanking.length, source: IPL_STATS_URL };
      } catch (error) {
        live.scrapeReport[task.key] = { ok: false, error: error.message, source: IPL_STATS_URL };
        errors.push(`${task.key}: ${error.message}`);
      }
    }

    try {
      live.titleWinner = await scrapePointsTable(context);
      live.tableBottom = { ranking: [...live.titleWinner.extendedRanking], extendedRanking: [...live.titleWinner.extendedRanking] };
      live.scrapeReport.titleWinner = { ok: true, count: live.titleWinner.extendedRanking.length, source: live.titleWinner.source };
      live.scrapeReport.tableBottom = { ok: true, count: live.tableBottom.extendedRanking.length, source: live.titleWinner.source };
    } catch (error) {
      live.scrapeReport.titleWinner = { ok: false, error: error.message, source: IPL_POINTS_URLS[0] };
      live.scrapeReport.tableBottom = { ok: false, error: error.message, source: IPL_POINTS_URLS[0] };
      errors.push(`points-table: ${error.message}`);
    }

    try {
      live.highestScoreTeam = await scrapeHighestTeamScores(context);
      live.scrapeReport.highestScoreTeam = { ok: true, count: live.highestScoreTeam.extendedRanking.length, source: live.highestScoreTeam.source };
    } catch (error) {
      live.scrapeReport.highestScoreTeam = { ok: false, error: error.message, source: IPL_RESULTS_URLS[0] };
      errors.push(`highestScoreTeam: ${error.message}`);
    }

    try {
      live.mostCatches = await scrapeMostCatches(context);
      live.scrapeReport.mostCatches = { ok: true, count: live.mostCatches.extendedRanking.length, source: live.mostCatches.source };
    } catch (error) {
      live.scrapeReport.mostCatches = { ok: false, error: error.message, source: ESPN_CATCHES_URLS[0] };
      errors.push(`mostCatches: ${error.message}`);
    }
  } finally {
    await context.close().catch(() => {});
  }

  if (live.mvp.extendedRanking.length) {
    live.uncappedMvp = { ranking: [...live.mvp.extendedRanking], extendedRanking: [...live.mvp.extendedRanking] };
    live.leastMvp = { ranking: [...live.mvp.extendedRanking], extendedRanking: [...live.mvp.extendedRanking] };
  }

  live.fetchedAt = new Date().toISOString();
  live.scrapeStatus = errors.length ? `partial (${Object.values(live.scrapeReport).filter((x) => x?.ok).length} ok, ${errors.length} failed)` : 'ok';

  if (!majorCategoryCount(live)) {
    throw new Error('All major categories are still empty. The worker still could not navigate the controls/tables correctly.');
  }

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
