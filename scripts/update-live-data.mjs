import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const DEBUG_DIR = path.join(ROOT, 'debug');
const DATA_FILE = path.join(DATA_DIR, 'live.json');
const USER_DATA_DIR = path.join(ROOT, '.chrome-profile');

const IPL_STATS_URL = 'https://www.iplt20.com/stats/2026';
const IPL_POINTS_URL = 'https://www.iplt20.com/points-table/men';
const IPL_RESULTS_URL = 'https://www.iplt20.com/matches/results';
const ESPN_SERIES_STATS_URL = 'https://www.espncricinfo.com/series/ipl-2026-1510719/stats';

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
  ['c green', 'Cameron Green'], ['cameron green', 'Cameron Green'],
  ['j duffy', 'Jacob Duffy'], ['jacob duffy', 'Jacob Duffy']
]);

const STAT_TASKS = [
  { key: 'orangeCap', tab: 'Season', group: null, labels: ['Orange Cap'], entity: 'player', top5: true },
  { key: 'mostSixes', tab: 'Season', group: null, labels: ['Angel One Super Sixes Of The Season', 'Angel One Super Sixes of the Season'], entity: 'player', top5: true },
  { key: 'purpleCap', tab: 'Season', group: 'BOWLERS', labels: ['Purple Cap'], entity: 'player', top5: true },
  { key: 'mostDots', tab: 'Season', group: 'BOWLERS', labels: ['TATA IPL Green Dot Balls'], entity: 'player', top5: true },
  { key: 'mvp', tab: 'Awards', group: null, labels: ['Most Valuable Player', 'MVP', 'TATA IPL Most Valuable Player'], entity: 'player', top5: true },
  { key: 'fairPlay', tab: 'Awards', group: null, labels: ['Wonder Cement Fairplay Award', 'Wonder Cement FairPlay Award'], entity: 'team' },
  { key: 'striker', tab: 'Season', group: null, labels: ['Curvv Super Striker Of The Season', 'Curvv Super Striker of the Season'], entity: 'player' },
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

async function clickText(page, text) {
  return page.evaluate((wanted) => {
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 20 && r.height > 12 && s.display !== 'none' && s.visibility !== 'hidden';
    };
    const all = [...document.querySelectorAll('button, [role="button"], [role="tab"], a, div, span, label')];
    const node = all.find((el) => visible(el) && norm(el.innerText || el.textContent) === norm(wanted));
    if (!node) return false;
    node.click?.();
    return true;
  }, text).catch(() => false);
}

async function directSetMetric(page, task) {
  return page.evaluate(({ group, labels }) => {
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const wants = labels.map(norm);

    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 20 && r.height > 12 && s.display !== 'none' && s.visibility !== 'hidden';
    };

    const dispatchChange = (el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    // 1) native selects first
    const selects = [...document.querySelectorAll('select')];
    if (group) {
      const groupInputs = [...document.querySelectorAll('input[type="radio"], input[type="checkbox"]')];
      for (const input of groupInputs) {
        const label = input.labels?.[0]?.innerText || input.parentElement?.innerText || '';
        if (norm(label) === norm(group)) {
          input.checked = true;
          dispatchChange(input);
          input.click?.();
        }
      }
    }

    for (const select of selects) {
      const options = [...select.options];
      const hit = options.find((o) => wants.some((w) => norm(o.textContent).includes(w)));
      if (hit) {
        select.value = hit.value;
        dispatchChange(select);
        return { ok: true, via: 'native-select', selected: hit.textContent.trim() };
      }
    }

    return { ok: false };
  }, { group: task.group || '', labels: task.labels });
}

async function clickMetricDropdown(page) {
  const ok = await page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 140 && r.height > 24 && s.display !== 'none' && s.visibility !== 'hidden' && r.y > 180 && r.y < 420;
    };
    const nodes = [...document.querySelectorAll('select, [role="combobox"], [aria-haspopup="listbox"], button, div, input')]
      .filter(visible)
      .map((el) => ({ el, x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y, w: el.getBoundingClientRect().width }))
      .filter((n) => n.w >= 150 && n.w <= 420)
      .sort((a, b) => a.y - b.y || a.x - b.x);
    const rowY = nodes[0]?.y ?? 0;
    const row = nodes.filter((n) => Math.abs(n.y - rowY) < 35).sort((a, b) => a.x - b.x);
    const target = row[1] || nodes[1];
    if (!target) return false;
    target.el.click?.();
    return true;
  }).catch(() => false);
  if (ok) await page.waitForTimeout(600);
  return ok;
}

async function clickMetricPanelOption(page, task) {
  return page.evaluate(({ group, labels }) => {
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const wants = labels.map(norm);

    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 20 && r.height > 12 && s.display !== 'none' && s.visibility !== 'hidden';
    };

    const panels = [...document.querySelectorAll('div, ul')].filter(visible).filter((el) => {
      const txt = norm(el.innerText || el.textContent);
      return txt.includes('batters') || txt.includes('bowlers');
    });

    const panel = panels.sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
    if (!panel) return { ok: false, reason: 'no-panel' };

    const clickNode = (el) => {
      if (!el) return false;
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      el.click?.();
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      return true;
    };

    if (group) {
      const groupNode = [...panel.querySelectorAll('label, span, div, button, input')]
        .find((el) => visible(el) && norm(el.innerText || el.textContent || el.value) === norm(group));
      if (groupNode) clickNode(groupNode);
    }

    const nodes = [...panel.querySelectorAll('li, div, span, button, option, a')].filter(visible);
    const optionNode = nodes.find((el) => {
      const txt = norm(el.innerText || el.textContent || el.value);
      return wants.some((w) => txt === w || txt.includes(w));
    });

    if (optionNode) {
      clickNode(optionNode);
      return { ok: true };
    }

    if (panel.scrollHeight > panel.clientHeight + 10) {
      panel.scrollTop += 240;
      return { ok: false, reason: 'scroll' };
    }

    return { ok: false, reason: 'not-found' };
  }, { group: task.group || '', labels: task.labels });
}

async function chooseStatsMetric(page, task) {
  await page.evaluate(() => window.scrollTo(0, 320)).catch(() => {});
  await page.waitForTimeout(250);

  const tabOk = await clickText(page, task.tab);
  if (!tabOk) throw new Error(`Could not click tab: ${task.tab}`);
  await page.waitForTimeout(600);

  // DOM-first approach
  let result = await directSetMetric(page, task);
  if (result?.ok) {
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    return;
  }

  // visible panel fallback
  let opened = await clickMetricDropdown(page);
  if (!opened) throw new Error('Could not open metric dropdown');

  for (let i = 0; i < 10; i += 1) {
    result = await clickMetricPanelOption(page, task);
    if (result?.ok) {
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1000);
      return;
    }
    if (result?.reason === 'no-panel') {
      opened = await clickMetricDropdown(page);
      if (!opened) break;
    }
    await page.waitForTimeout(250);
  }

  throw new Error(`Could not select metric: ${task.labels.join(' / ')}`);
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

function parseTeamScoresFromText(text) {
  const lines = String(text || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const values = {};
  for (const line of lines) {
    const scoreMatch = line.match(/\b(\d{2,3})\/\d{1,2}\b/);
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
    const ranking = table ? extractRankingFromRows(table.rows, task.entity) : [];
    if (!ranking.length) throw new Error('No ranking extracted from stats table');
    return { ranking: task.top5 ? ranking.slice(0, 5) : ranking, extendedRanking: ranking };
  } catch (error) {
    await saveDebug(page, `fail_${task.key}`);
    throw error;
  } finally {
    await page.close().catch(() => {});
  }
}

async function scrapePointsTable(context) {
  const page = await makePage(context);
  try {
    await gotoSettled(page, IPL_POINTS_URL, 'blocked_points');
    const tables = await extractVisibleTables(page);
    const table = pickBestTable(tables, 'team');
    const ranking = table ? extractRankingFromRows(table.rows, 'team') : [];
    if (ranking.length < 6) throw new Error('No visible points table found');
    return { ranking, extendedRanking: ranking, playoffs: ranking.slice(0, 4), finalists: [], winner: null, source: IPL_POINTS_URL };
  } catch (error) {
    await saveDebug(page, 'fail_points_table');
    throw error;
  } finally {
    await page.close().catch(() => {});
  }
}

async function scrapeHighestTeamScores(context) {
  const page = await makePage(context);
  try {
    await gotoSettled(page, IPL_RESULTS_URL, 'blocked_results');
    for (let i = 0; i < 10; i += 1) {
      const more = await clickText(page, 'Load More') || await clickText(page, 'Show More') || await clickText(page, 'More');
      if (!more) break;
      await page.waitForTimeout(300);
    }
    const text = await page.locator('body').innerText().catch(() => '');
    const values = parseTeamScoresFromText(text);
    const ranking = Object.entries(values).sort((a, b) => b[1] - a[1]).map(([team]) => team);
    if (!ranking.length) throw new Error('Could not extract any team scores from results page');
    return { ranking, extendedRanking: ranking, values, source: IPL_RESULTS_URL };
  } catch (error) {
    await saveDebug(page, 'fail_results');
    throw error;
  } finally {
    await page.close().catch(() => {});
  }
}

async function scrapeMostCatches() {
  return { ranking: [], extendedRanking: [], source: ESPN_SERIES_STATS_URL };
}

function majorCategoryCount(live) {
  return [
    live.orangeCap.extendedRanking.length,
    live.mostSixes.extendedRanking.length,
    live.purpleCap.extendedRanking.length,
    live.mostDots.extendedRanking.length,
    live.mvp.extendedRanking.length,
    live.highestScoreTeam.extendedRanking.length,
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
      live.scrapeReport.titleWinner = { ok: true, count: live.titleWinner.extendedRanking.length, source: IPL_POINTS_URL };
      live.scrapeReport.tableBottom = { ok: true, count: live.tableBottom.extendedRanking.length, source: IPL_POINTS_URL };
    } catch (error) {
      live.scrapeReport.titleWinner = { ok: false, error: error.message, source: IPL_POINTS_URL };
      live.scrapeReport.tableBottom = { ok: false, error: error.message, source: IPL_POINTS_URL };
      errors.push(`points-table: ${error.message}`);
    }

    try {
      live.highestScoreTeam = await scrapeHighestTeamScores(context);
      live.scrapeReport.highestScoreTeam = { ok: true, count: live.highestScoreTeam.extendedRanking.length, source: IPL_RESULTS_URL };
    } catch (error) {
      live.scrapeReport.highestScoreTeam = { ok: false, error: error.message, source: IPL_RESULTS_URL };
      errors.push(`highestScoreTeam: ${error.message}`);
    }

    try {
      live.mostCatches = await scrapeMostCatches();
      live.scrapeReport.mostCatches = { ok: false, error: 'Temporarily disabled to avoid junk data', source: ESPN_SERIES_STATS_URL };
    } catch (error) {
      live.scrapeReport.mostCatches = { ok: false, error: error.message, source: ESPN_SERIES_STATS_URL };
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
    throw new Error('All major categories are still empty. Native DOM control selection also failed.');
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
