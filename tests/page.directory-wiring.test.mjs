import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('public duel directory wiring exists in the page shell', async () => {
  const html = await fs.readFile(path.resolve(process.cwd(), 'index.html'), 'utf8');

  assert.match(html, /id="duelStudioCard"/);
  assert.match(html, /id="authPanel"/);
  assert.match(html, /id="createDuelPanel"/);
  assert.match(html, /id="duelControlsPanel"/);
  assert.match(html, /id="duelDirectory"/);
  assert.match(html, /id="duelDirectorySummary"/);
  assert.match(html, /id="pickPickerModal"/);
  assert.match(html, /duels-backend\.config\.js/);
  assert.match(html, /duels-backend\.js/);
  assert.match(html, /function sortedDirectoryDuels\(/);
  assert.match(html, /function buildDuelShareUrl\(/);
  assert.match(html, /function joinDuelByCode\(/);
  assert.match(html, /function copyDuelCode\(/);
  assert.match(html, /function renderDuelStudio\(/);
  assert.match(html, /function createCustomDuel\(/);
  assert.match(html, /function claimActiveOpenSlot\(/);
  assert.match(html, /function renderPickPicker\(/);
  assert.match(html, /function deriveCustomBundleLifecycle\(/);
  assert.match(html, /function withFreshLifecycle\(/);
  assert.match(html, /function syncRemoteBundlesForRoom\(/);
  assert.match(html, /function usesHostedDuelsBackend\(/);
  assert.match(html, /function initializeDuelsApp\(/);
  assert.match(html, /LOCAL_AUTH_STORAGE_KEY/);
  assert.match(html, /data-copy-duel-link=/);
  assert.match(html, /data-pick-key=/);
  assert.match(html, /data-open-picker=/);
  assert.match(html, /data-open-duel=/);
  assert.match(html, /id="joinByCodeForm"/);
  assert.match(html, /id="joinByCodeInput"/);
  assert.match(html, /window\.history\.replaceState/);
});
