import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { validateWarRoomConfig } from '../warroom-room-model.mjs';

async function readJson(filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  return JSON.parse(await fs.readFile(abs, 'utf8'));
}

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: node scripts/validate-war-room-config.mjs <fixture.json> [more...]');
    process.exit(1);
  }

  let failed = false;
  for (const file of files) {
    const json = await readJson(file);
    const result = validateWarRoomConfig(json);
    if (!result.ok) {
      failed = true;
      console.error(`✗ ${file}`);
      for (const err of result.errors) console.error(`  - ${err}`);
      continue;
    }
    console.log(`✓ ${file}`);
    for (const warn of result.warnings) console.log(`  ! ${warn}`);
  }

  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
