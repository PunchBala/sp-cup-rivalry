import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  buildMiniFantasyLiveProvisionalPayload,
  buildMiniFantasyLiveProvisionalSummary,
  createMiniFantasyLiveProvisionalEmptyPayload,
  createMiniFantasyLiveTemplate
} from '../mini-fantasy/live-provisional-builder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'mini_fantasy_live_provisional.json');
const MANUAL_DIR = path.join(ROOT_DIR, 'manual-live');
const SCHEDULE_FILE = path.join(ROOT_DIR, 'ipl_2026_schedule.json');
const SQUADS_FILE = path.join(ROOT_DIR, 'ipl_2026_squads.json');
const TEAM_ROLES_FILE = path.join(ROOT_DIR, 'ipl_2026_team_roles.json');

const USAGE = `Usage:
  node scripts/build-mini-fantasy-live-provisional.mjs --init --match 44 [--output manual-live/match-44.live.json]
  node scripts/build-mini-fantasy-live-provisional.mjs --input manual-live/match-44.live.json --dry-run
  node scripts/build-mini-fantasy-live-provisional.mjs --input manual-live/match-44.live.json
  node scripts/build-mini-fantasy-live-provisional.mjs --clear

Input schema:
  {
    "matchNo": 44,
    "updatedAtUtc": "2026-05-02T15:20:00Z",
    "status": "Chennai Super Kings 128/4 after 15.0 overs",
    "note": "Manual refresh from official IPL scorecard screenshot.",
    "winningTeamCode": "",
    "isNoResult": false,
    "innings": [
      {
        "team": "Chennai Super Kings",
        "totalRuns": 128,
        "wickets": 4,
        "overs": "15.0",
        "extras": { "byes": 0, "legByes": 1, "wides": 5, "noBalls": 0, "penalties": 0 },
        "batting": [
          { "name": "Devon Conway", "dismissalText": "c Ryan Rickelton b Jasprit Bumrah", "runs": 42, "balls": 28, "fours": 5, "sixes": 1 }
        ],
        "bowling": [
          { "name": "Jasprit Bumrah", "overs": "4", "maidens": 0, "runs": 22, "wickets": 2, "dots": 11 }
        ]
      }
    ]
  }`;

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function parseArgs(argv) {
  const options = {
    init: false,
    clear: false,
    dryRun: false,
    match: null,
    input: null,
    output: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--init') {
      options.init = true;
      continue;
    }
    if (token === '--clear') {
      options.clear = true;
      continue;
    }
    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (token === '--match') {
      options.match = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--input') {
      options.input = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--output') {
      options.output = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--help' || token === '-h') {
      console.log(USAGE);
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalizeScheduleFixture(rawFixture = {}) {
  return {
    ...rawFixture,
    match_no: Number(rawFixture.match_no || 0) || null,
    home_team_code: String(rawFixture.home_team_code || '').toUpperCase(),
    away_team_code: String(rawFixture.away_team_code || '').toUpperCase(),
    fixture: normalizeWhitespace(rawFixture.fixture || `${rawFixture.away_team || ''} vs ${rawFixture.home_team || ''}`)
  };
}

export { buildMiniFantasyLiveProvisionalPayload } from '../mini-fantasy/live-provisional-builder.js';

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.clear) {
    await writeJson(DATA_FILE, createMiniFantasyLiveProvisionalEmptyPayload());
    console.log(JSON.stringify({ ok: true, cleared: true, output: path.relative(ROOT_DIR, DATA_FILE) }, null, 2));
    return;
  }

  const schedule = (await readJson(SCHEDULE_FILE)).map(normalizeScheduleFixture);
  if (options.init) {
    const matchNo = Number(options.match || 0) || null;
    if (!matchNo) throw new Error('--init requires --match <number>.');
    const fixture = schedule.find((item) => Number(item.match_no || 0) === matchNo);
    if (!fixture) throw new Error(`Match ${matchNo} was not found in the schedule.`);
    const outputPath = options.output
      ? path.resolve(ROOT_DIR, options.output)
      : path.join(MANUAL_DIR, `match-${matchNo}.live.json`);
    await writeJson(outputPath, createMiniFantasyLiveTemplate(fixture));
    console.log(JSON.stringify({ ok: true, initialized: true, output: path.relative(ROOT_DIR, outputPath) }, null, 2));
    return;
  }

  if (!options.input) {
    throw new Error('Provide --input <manual-live-file>, or use --init / --clear.');
  }

  const inputPath = path.resolve(ROOT_DIR, options.input);
  const manualInput = await readJson(inputPath);
  const matchNo = Number(manualInput?.matchNo || manualInput?.match_no || 0) || null;
  if (!matchNo) throw new Error('Manual live file is missing a valid matchNo.');
  const fixture = schedule.find((item) => Number(item.match_no || 0) === matchNo);
  if (!fixture) throw new Error(`Match ${matchNo} was not found in the schedule.`);

  const squads = await readJson(SQUADS_FILE);
  const teamRoles = await readJson(TEAM_ROLES_FILE);
  const payload = buildMiniFantasyLiveProvisionalPayload({
    manualInput,
    fixture,
    squads,
    teamRoles
  });
  const summary = buildMiniFantasyLiveProvisionalSummary(payload);

  if (options.dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun: true, summary }, null, 2));
    return;
  }

  await writeJson(DATA_FILE, payload);
  console.log(JSON.stringify({
    ok: true,
    output: path.relative(ROOT_DIR, DATA_FILE),
    summary
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
