import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] ?? process.cwd());
const humanDir = resolve(root, '.human');
const failures = [];
const passes = [];

function fail(message) { failures.push(message); }
function pass(message) { passes.push(message); }

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

let config;
try {
  config = await readJson(resolve(humanDir, 'him.config.json'));
  pass('Contract');
} catch (error) {
  fail(`Contract: ${error.message}`);
}

if (config) {
  if (!/^1\./.test(config.human_model_version ?? '')) fail('Version: human_model_version deve essere 1.x');
  if (!['HIM-L1', 'HIM-L2', 'HIM-L3'].includes(config.profile)) fail('Profile: valore non valido');
  if (!config.product?.id) fail('Product: id mancante');
  if (config.requirements?.human_task_required !== true) fail('Requirements: human_task_required deve essere true');
}

let taskFiles = [];
try {
  taskFiles = (await readdir(resolve(humanDir, 'tasks'))).filter((name) => name.endsWith('.json'));
} catch (error) {
  fail(`Human Tasks: ${error.message}`);
}

if (config?.requirements?.human_task_required && taskFiles.length === 0) {
  fail('Human Tasks: nessun task dichiarato');
}

for (const file of taskFiles) {
  try {
    const task = await readJson(resolve(humanDir, 'tasks', file));
    const required = ['id', 'actor', 'intent', 'success', 'primary_action', 'failure_states', 'recovery', 'patterns'];
    for (const key of required) if (task[key] === undefined) fail(`${file}: campo ${key} mancante`);
    if (!/^HT-[A-Z0-9][A-Z0-9_-]*$/.test(task.id ?? '')) fail(`${file}: id non conforme`);
    if (!Array.isArray(task.failure_states) || task.failure_states.length === 0) fail(`${file}: failure_states vuoto`);
    if (!Array.isArray(task.patterns) || task.patterns.length === 0) fail(`${file}: patterns vuoto`);
    if (Array.isArray(task.secondary_actions) && task.secondary_actions.length > 2) fail(`${file}: più di due azioni secondarie`);
    if (task.recovery?.required === true && (!Array.isArray(task.recovery.strategies) || task.recovery.strategies.length === 0)) {
      fail(`${file}: recovery richiesta senza strategia`);
    }
    if (task.consequential === true && task.human_authority_required !== true) {
      fail(`${file}: azione consequential senza human authority boundary`);
    }
    pass(`Task ${task.id ?? file}`);
  } catch (error) {
    fail(`${file}: ${error.message}`);
  }
}

for (const item of passes) console.log(`PASS ${item}`);
for (const item of failures) console.error(`FAIL ${item}`);

if (failures.length > 0) {
  console.error(`\nHUMAN_INTERACTION_FAIL (${failures.length})`);
  process.exit(1);
}

console.log('\nHUMAN_INTERACTION_PASS');
