import fs from 'node:fs/promises';
import path from 'node:path';

import { generatePrices } from '../mini-fantasy/pricing-engine.js';

async function readInput() {
  const candidatePath = process.argv[2];

  if (candidatePath) {
    const resolvedPath = path.resolve(process.cwd(), candidatePath);
    const raw = await fs.readFile(resolvedPath, 'utf8');
    return JSON.parse(raw);
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    throw new Error('Provide a pricing job JSON file path or pipe a JSON payload via stdin.');
  }

  return JSON.parse(raw);
}

const input = await readInput();
const output = generatePrices(input);
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
