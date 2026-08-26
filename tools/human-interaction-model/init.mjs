import { cp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? process.cwd());
const humanDir = resolve(root, '.human');
const configTarget = resolve(humanDir, 'him.config.json');

await mkdir(resolve(humanDir, 'tasks'), { recursive: true });
await mkdir(resolve(humanDir, 'journeys'), { recursive: true });
await mkdir(resolve(humanDir, 'acceptance'), { recursive: true });
await mkdir(resolve(humanDir, 'evidence'), { recursive: true });

try {
  await access(configTarget);
  console.log('HIM init: configurazione esistente preservata');
} catch {
  const raw = await readFile(resolve(here, 'him.config.example.json'), 'utf8');
  const config = JSON.parse(raw);
  config.product.id = root.split(/[\\/]/).filter(Boolean).at(-1) ?? 'product';
  await writeFile(configTarget, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  console.log('HIM init: creato .human/him.config.json');
}

try {
  await cp(resolve(here, 'human-task.schema.json'), resolve(humanDir, 'human-task.schema.json'), { force: false });
} catch {
  // Preserve repository-local schema if already installed.
}

console.log('HIM init: directory tasks/journeys/acceptance/evidence pronte');
console.log('HIM init: eseguire validate.mjs dopo avere dichiarato almeno un Human Task');
