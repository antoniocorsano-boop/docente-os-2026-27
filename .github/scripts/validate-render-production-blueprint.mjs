import fs from 'node:fs'

const path = 'ops/render-production-blueprint.yaml'
const yaml = fs.readFileSync(path, 'utf8')
const fail = (message) => {
  console.error(`Render Production blueprint invalid: ${message}`)
  process.exit(1)
}

const required = [
  'name: docente-os-2026-27-production',
  'runtime: node',
  'plan: free',
  'region: frankfurt',
  'repo: https://github.com/antoniocorsano-boop/docente-os-2026-27',
  'branch: develop',
  'rootDir: product',
  'buildCommand: npm ci --no-audit --no-fund && npm run build',
  'startCommand: npm start',
  'autoDeployTrigger: off',
  'healthCheckPath: /',
]
for (const token of required) {
  if (!yaml.includes(token)) fail(`missing ${token}`)
}

for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_APP_URL']) {
  const block = new RegExp(`- key: ${key}\\n\\s+sync: false`)
  if (!block.test(yaml)) fail(`${key} must be declared sync:false`)
}

for (const forbidden of [
  'docente-os-2026-27-beta',
  'gnshgapmwyjamhmlikeg',
  'docente-os-2026-27-beta.onrender.com',
  'sb_publishable_',
  'sb_secret_',
]) {
  if (yaml.includes(forbidden)) fail(`forbidden Beta or key material: ${forbidden}`)
}

if (/autoDeployTrigger:\s+(commit|checksPass)/.test(yaml)) fail('Production auto deploy must remain off')

console.log('Render Production blueprint PASS: isolated handoff, Frankfurt, autoDeploy off, env values external')
