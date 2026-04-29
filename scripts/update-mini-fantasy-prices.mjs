import fs from 'node:fs/promises';
import path from 'node:path';

import {
  MINI_FANTASY_SEASON,
  generateMiniFantasyOpenFixturePriceSnapshots,
  generateMiniFantasyPriceBook
} from '../mini-fantasy/contest-engine.js';

async function readJsonIfExists(filePath, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

const root = process.cwd();
const livePath = path.resolve(root, 'data/live.json');
const schedulePath = path.resolve(root, 'ipl_2026_schedule.json');
const squadsPath = path.resolve(root, 'ipl_2026_squads.json');
const rolesPath = path.resolve(root, 'ipl_2026_team_roles.json');
const priceBookPath = path.resolve(root, 'data/mini_fantasy_prices.json');
const openFixtureSnapshotsPath = path.resolve(root, 'data/mini_fantasy_open_fixture_price_snapshots.json');

const [liveData, schedule, squads, teamRoles, previousPriceBook, previousOpenFixtureSnapshots] = await Promise.all([
  readJsonIfExists(livePath),
  readJsonIfExists(schedulePath, []),
  readJsonIfExists(squadsPath, {}),
  readJsonIfExists(rolesPath, {}),
  readJsonIfExists(priceBookPath, null),
  readJsonIfExists(openFixtureSnapshotsPath, null)
]);

if (!liveData) {
  throw new Error('data/live.json is required before mini fantasy prices can be generated.');
}

const asOfUtc = liveData?.fetchedAt || new Date().toISOString();
const nextPriceBook = generateMiniFantasyPriceBook({
  liveData,
  schedule,
  squads,
  teamRoles,
  previousPriceBook,
  asOfUtc,
  season: MINI_FANTASY_SEASON
});
const nextOpenFixtureSnapshots = generateMiniFantasyOpenFixturePriceSnapshots({
  schedule,
  squads,
  teamRoles,
  priceBook: nextPriceBook,
  previousSnapshots: previousOpenFixtureSnapshots,
  asOfUtc,
  season: MINI_FANTASY_SEASON
});

await Promise.all([
  fs.writeFile(priceBookPath, `${JSON.stringify(nextPriceBook, null, 2)}\n`, 'utf8'),
  fs.writeFile(openFixtureSnapshotsPath, `${JSON.stringify(nextOpenFixtureSnapshots, null, 2)}\n`, 'utf8')
]);
process.stdout.write(`Wrote ${path.relative(root, priceBookPath)} with ${nextPriceBook.players.length} players.\n`);
process.stdout.write(`Wrote ${path.relative(root, openFixtureSnapshotsPath)} with ${nextOpenFixtureSnapshots.fixtures.length} open fixture snapshots.\n`);
