import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RAW_RADIUS_RE, RAW_SHADOW_RE } from './design-conformance-patterns.mjs'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(scriptPath), '../../..')
const runtimeRoots = [
  path.join(repoRoot, 'product/src/app'),
  path.join(repoRoot, 'product/src/components'),
]
const outputDir = path.join(repoRoot, 'product/test-results/design-policy')
const baselinePath = path.join(repoRoot, 'product/design/DESIGN_DEBT_BASELINE.json')

const VISUAL_EXT_RE = /\.(?:css|tsx?|mjs|svg)$/
const RAW_COLOR_RE = /#[0-9a-fA-F]{3,8}\b|(?:rgb|rgba|hsl|hsla)\s*\(/g
const TOKEN_RE = /--(?:color|brand|primary|success|warning|danger|info|radius|shadow)[\w-]*\s*:/gi
const LEGACY_BRAND_RE = /(?:\.brandMark\b|\.brandLockup\b|\bbrandMark\b|\bbrandLockup\b)/g
const DECORATIVE_RE = /(?:backdrop-filter\s*:|filter\s*:\s*(?:blur|drop-shadow)|text-shadow\s*:)/g

const RAW_COLOR_EXEMPT = new Set([
  'product/src/app/brand-system.css',
  'product/src/components/brand/brand-mark-geometry.ts',
  'product/src/app/icon.svg',
])
const TOKEN_EXEMPT = new Set(['product/src/app/brand-system.css'])
const RAW_RADIUS_EXEMPT = new Set(['product/src/app/brand-system.css'])
const RAW_SHADOW_EXEMPT = new Set(['product/src/app/brand-system.css'])

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(absolute))
    else if (entry.isFile() && VISUAL_EXT_RE.test(entry.name)) out.push(absolute)
  }
  return out
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/')
}

function count(re, text) {
  return [...text.matchAll(re)].length
}

function scanFile(file) {
  const filePath = rel(file)
  const content = fs.readFileSync(file, 'utf8')
  return {
    path: filePath,
    rawColors: RAW_COLOR_EXEMPT.has(filePath) ? 0 : count(RAW_COLOR_RE, content),
    localTokens: TOKEN_EXEMPT.has(filePath) ? 0 : count(TOKEN_RE, content),
    legacyBrand: count(LEGACY_BRAND_RE, content),
    decorativeEffects: count(DECORATIVE_RE, content),
    rawRadii: RAW_RADIUS_EXEMPT.has(filePath) ? 0 : count(RAW_RADIUS_RE, content),
    rawShadows: RAW_SHADOW_EXEMPT.has(filePath) ? 0 : count(RAW_SHADOW_RE, content),
  }
}

function totals(files) {
  return files.reduce((acc, item) => {
    for (const key of ['rawColors', 'localTokens', 'legacyBrand', 'decorativeEffects', 'rawRadii', 'rawShadows']) {
      acc[key] += item[key]
    }
    return acc
  }, { rawColors: 0, localTokens: 0, legacyBrand: 0, decorativeEffects: 0, rawRadii: 0, rawShadows: 0 })
}

function topFiles(files) {
  return files
    .map((item) => ({ ...item, score: item.rawColors + item.localTokens + item.legacyBrand + item.decorativeEffects + item.rawRadii + item.rawShadows }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 20)
}

const files = runtimeRoots.flatMap(walk).map(scanFile)
const current = totals(files)
const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null
const regressions = []
if (baseline?.metrics) {
  for (const [metric, value] of Object.entries(current)) {
    const allowed = Number(baseline.metrics[metric] ?? 0)
    if (value > allowed) regressions.push({ metric, current: value, baseline: allowed })
  }
}

const status = baseline ? (regressions.length ? 'FAIL' : 'PASS') : 'BASELINE_REQUIRED'
const report = {
  schema: 'docente-os.design-conformance.v1',
  status,
  scannedFiles: files.length,
  metrics: current,
  regressions,
  topFiles: topFiles(files),
  baseline: baseline?.metrics ?? null,
}

fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(path.join(outputDir, 'design-conformance.json'), `${JSON.stringify(report, null, 2)}\n`)

const rows = report.topFiles.length
  ? report.topFiles.map((item) => `| \`${item.path}\` | ${item.rawColors} | ${item.localTokens} | ${item.legacyBrand} | ${item.decorativeEffects} | ${item.rawRadii} | ${item.rawShadows} |`).join('\n')
  : '| — | 0 | 0 | 0 | 0 | 0 | 0 |'
const regressionText = regressions.length
  ? regressions.map((item) => `- **${item.metric}**: ${item.current} > baseline ${item.baseline}`).join('\n')
  : '- Nessuna regressione rispetto alla baseline.'

const markdown = `# Design Conformance — DPG-2\n\n- **Esito:** **${status}**\n- **File runtime analizzati:** ${files.length}\n- **Raw colors:** ${current.rawColors}\n- **Local tokens:** ${current.localTokens}\n- **Legacy brand references:** ${current.legacyBrand}\n- **Decorative effects:** ${current.decorativeEffects}\n- **Raw radii:** ${current.rawRadii}\n- **Raw shadows:** ${current.rawShadows}\n\n## Ratchet\n\n${regressionText}\n\n## File con maggiore debito visuale\n\n| File | Colors | Tokens | Legacy brand | Effects | Radii | Shadows |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${rows}\n\nLa baseline DPG-2 è un tetto, non un obiettivo: può soltanto diminuire.\n`
fs.writeFileSync(path.join(outputDir, 'design-conformance.md'), markdown)
process.stdout.write(markdown)
if (regressions.length) process.exitCode = 1
