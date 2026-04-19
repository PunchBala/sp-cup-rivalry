import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function readJson(fileName) {
  const filePath = path.resolve(process.cwd(), fileName);
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

test('player availability directory uses supported statuses and references known squad players', async () => {
  const [squads, availability] = await Promise.all([
    readJson('ipl_2026_squads.json'),
    readJson('ipl_2026_player_availability.json')
  ]);

  const supportedStatuses = new Set(['available', 'doubtful', 'unavailable', 'replaced']);

  Object.entries(availability).forEach(([teamCode, players]) => {
    const squad = new Set(Array.isArray(squads[teamCode]) ? squads[teamCode] : []);
    assert.ok(squad.size, `Expected squad data for ${teamCode}`);

    Object.entries(players || {}).forEach(([playerName, meta]) => {
      assert.ok(supportedStatuses.has(meta?.status), `Unsupported availability status for ${teamCode} ${playerName}`);
      if (meta?.status === 'available' || meta?.status === 'doubtful') {
        assert.ok(squad.has(playerName), `${teamCode} ${meta.status} entry missing from squad list: ${playerName}`);
      }

      if (meta?.replaced_by) {
        assert.ok(squad.has(meta.replaced_by), `${teamCode} replacement player missing from squad list: ${meta.replaced_by}`);
      }
    });
  });
});

test('replacement players added for mini fantasy have role coverage', async () => {
  const teamRoles = await readJson('ipl_2026_team_roles.json');
  const roleMap = teamRoles?.teams || {};

  const expectedRoles = {
    CSK: ['Spencer Johnson'],
    GT: ['Kulwant Khejroliya'],
    KKR: ['Navdeep Saini', 'Saurabh Dubey', 'Blessing Muzarabani'],
    LSG: ['George Linde'],
    MI: ['Krish Bhagat'],
    RR: ['Dasun Shanaka'],
    SRH: ['Dilshan Madushanka', 'David Payne', 'Gerald Coetzee']
  };

  Object.entries(expectedRoles).forEach(([teamCode, players]) => {
    const teamPlayerRoles = roleMap?.[teamCode]?.players || {};
    players.forEach((playerName) => {
      assert.ok(teamPlayerRoles[playerName], `Expected role mapping for ${teamCode} ${playerName}`);
    });
  });
});
