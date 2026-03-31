import fs from 'node:fs/promises';
import path from 'node:path';
import { validateLeagueConfig } from '../warroom-league-model.mjs';

async function main() {
  const inputPaths = process.argv.slice(2);
  if (!inputPaths.length) {
    console.error('Usage: node scripts/validate-league-config.mjs <league-json> [more-json-files]');
    process.exit(1);
  }

  let hadError = false;

  for (const inputPath of inputPaths) {
    const absolutePath = path.resolve(process.cwd(), inputPath);
    try {
      const raw = await fs.readFile(absolutePath, 'utf8');
      const parsed = JSON.parse(raw);
      const result = validateLeagueConfig(parsed);
      if (!result.ok) {
        hadError = true;
        console.error(`❌ ${inputPath}`);
        for (const error of result.errors) console.error(`   - ${error}`);
      } else {
        console.log(`✅ ${inputPath}`);
        for (const warning of result.warnings) console.log(`   warning: ${warning}`);
      }
    } catch (error) {
      hadError = true;
      console.error(`❌ ${inputPath}`);
      console.error(`   - ${error.message}`);
    }
  }

  if (hadError) process.exit(1);
}

main();
