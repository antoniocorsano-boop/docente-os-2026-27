import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RUNTIME_VISUAL_RE = /^(?:product\/src\/(?:app|components)\/.*\.(?:css|tsx?|mjs|svg)|product\/src\/app\/icon\.svg|icon\.svg)$/
const RAW_COLOR_RE = /(?:#[0-9a-fA-F]{3,8}\b|(?:rgb|rgba|hsl|hsla)\s*\()/
const MOTION_RE = /(?:@keyframes\b|\b(?:animation|transition)(?:-[\w-]+)?\s*:)/
const ALTERNATE_ICON_LIBRARY_RE = /from\s+['"](?:react-icons(?:\/[^'"]*)?|@heroicons(?:\/[^'"]*)?|@fortawesome(?:\/[^'"]*)?|phosphor-react|@mui\/icons-material(?:\/[^'"]*)?)['"]/
const LOCAL_TOKEN_RE = /--(?:color|brand|primary|success|warning|danger|info|radius|shadow)[\w-]*\s*:/i
const LOCAL_BRAND_DEFINITION_RE = /(?:function\s+DocenteOsMark\b|const\s+DocenteOsMark\b|dosLogo(?:Frame|Stem|Thread|Dot)|DOCENTE_OS_MARK_GEOMETRY\s*=)/
const DECORATIVE_WATCH_RE = /(?:backdrop-filter\s*:|filter\s*:\s*(?:blur|drop-shadow)|text-shadow\s*:)/

const RAW_COLOR_ALLOWED = new Set([
  'product/src/app/brand-system.css',
  'product/src/components/brand/brand-mark-geometry.ts',
  'product/src/app/icon.svg',
  'icon.svg',
])
const TOKEN_DEFINITION_ALLOWED = new Set([
  'product/src/app/brand-system.css',
  'product/src/app/globals.css',
])
const BRAND_DEFINITION_ALLOWED = new Set([
  'product/src/components/brand/docente-os-brand.tsx',
  'product/src/components/brand/brand-mark-geometry.ts',
  'product/src/app/icon.svg',
  'icon.svg',
])

export function evaluatePolicy({ changedFiles, prBody = '', requireClassification = true }) {
  const findings = []
  const warnings = []
  const runtimeVisualFiles = changedFiles.filter((file) => RUNTIME_VISUAL_RE.test(file.path))

  if (requireClassification && runtimeVisualFiles.length > 0 && !/\b(?:COMPATIBLE|SUPERSEDING|BREAKING)\b/.test(prBody)) {
    findings.push(finding('DPG-20', 'Modifica visuale senza classificazione COMPATIBLE / SUPERSEDING / BREAKING.', 'PR_BODY'))
  }

  for (const file of runtimeVisualFiles) {
    for (const line of file.addedLines) {
      if (RAW_COLOR_RE.test(line) && !RAW_COLOR_ALLOWED.has(file.path)) {
        findings.push(finding('DPG-04', 'Colore raw introdotto fuori dai file canonici di token/brand.', file.path, line))
      }
      if (ALTERNATE_ICON_LIBRARY_RE.test(line)) {
        findings.push(finding('DPG-14', 'Libreria di icone alternativa introdotta: usare il set funzionale canonico.', file.path, line))
      }
      if (LOCAL_TOKEN_RE.test(line) && !TOKEN_DEFINITION_ALLOWED.has(file.path)) {
        findings.push(finding('DPG-19', 'Token visuale locale introdotto fuori dai file canonici dei token.', file.path, line))
      }
      if (LOCAL_BRAND_DEFINITION_RE.test(line) && !BRAND_DEFINITION_ALLOWED.has(file.path)) {
        findings.push(finding('DPG-01', 'Definizione locale del marchio: il simbolo può essere definito solo nel componente/geometria canonici.', file.path, line))
      }
      if (DECORATIVE_WATCH_RE.test(line)) {
        warnings.push(finding('DPG-07', 'Effetto decorativo da giustificare in HVA secondo la regola delle superfici calme.', file.path, line, 'WATCH'))
      }
    }

    const addsMotion = file.addedLines.some((line) => MOTION_RE.test(line))
    if (addsMotion && !file.content.includes('prefers-reduced-motion')) {
      findings.push(finding('DPG-13', 'Motion introdotto senza gestione prefers-reduced-motion nello stesso contratto di stile.', file.path))
    }
  }

  return {
    status: findings.length ? 'FAIL' : warnings.length ? 'WATCH' : 'PASS',
    runtimeVisualFiles: runtimeVisualFiles.map((file) => file.path),
    findings,
    warnings,
    automatedRules: ['DPG-01', 'DPG-04', 'DPG-13', 'DPG-14', 'DPG-19', 'DPG-20'],
    hvaRules: ['DPG-05', 'DPG-06', 'DPG-07', 'DPG-08', 'DPG-09', 'DPG-10', 'DPG-11', 'DPG-12', 'DPG-15', 'DPG-16', 'DPG-17', 'DPG-18'],
  }
}

export function parseAddedLines(diff) {
  return diff
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1))
}

export function normalizeSvg(value) {
  return value.replace(/\s+/g, ' ').replace(/> </g, '><').trim()
}

function finding(code, message, location, evidence = null, severity = 'FAIL') {
  return { severity, code, message, location, evidence: evidence?.trim() || null }
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

function resolveBase(repoRoot) {
  const explicit = process.env.DESIGN_POLICY_BASE_SHA?.trim()
  if (explicit && !/^0+$/.test(explicit)) return explicit
  const baseRef = process.env.GITHUB_BASE_REF?.trim()
  if (baseRef) return `origin/${baseRef}`
  try { return git(['rev-parse', 'HEAD^'], repoRoot) } catch { return 'HEAD' }
}

function collectChanges(repoRoot, base) {
  const names = git(['diff', '--name-only', `${base}...HEAD`], repoRoot)
    .split('\n').map((name) => name.trim()).filter(Boolean)
  return names.map((filePath) => {
    const absolute = path.join(repoRoot, filePath)
    const content = fs.existsSync(absolute) && fs.statSync(absolute).isFile() ? fs.readFileSync(absolute, 'utf8') : ''
    const diff = git(['diff', '--unified=0', `${base}...HEAD`, '--', filePath], repoRoot)
    return { path: filePath, content, addedLines: parseAddedLines(diff) }
  })
}

function assertIconParity(repoRoot, result) {
  const rootIcon = path.join(repoRoot, 'icon.svg')
  const appIcon = path.join(repoRoot, 'product/src/app/icon.svg')
  if (!fs.existsSync(rootIcon) || !fs.existsSync(appIcon)) return
  if (normalizeSvg(fs.readFileSync(rootIcon, 'utf8')) !== normalizeSvg(fs.readFileSync(appIcon, 'utf8'))) {
    result.findings.push(finding('DPG-01', 'Le due app icon non coincidono: esiste una variante locale del marchio.', 'icon.svg ↔ product/src/app/icon.svg'))
    result.status = 'FAIL'
  }
}

function renderMarkdown(result, base, head) {
  const failed = result.findings.length
    ? result.findings.map((f) => `- **${f.code} · ${f.severity}** — ${f.message} (${f.location})${f.evidence ? `\n  - \`${f.evidence}\`` : ''}`).join('\n')
    : '- Nessuna violazione deterministica.'
  const warnings = result.warnings.length
    ? result.warnings.map((f) => `- **${f.code} · WATCH** — ${f.message} (${f.location})`).join('\n')
    : '- Nessun WATCH statico.'
  return `# Design Policy Gate — DPG-1\n\n- **Base:** \`${base}\`\n- **Head:** \`${head}\`\n- **Esito:** **${result.status}**\n- **File visuali modificati:** ${result.runtimeVisualFiles.length}\n\n## Violazioni bloccanti\n\n${failed}\n\n## Watch\n\n${warnings}\n\n## Regole automatiche\n\n${result.automatedRules.join(', ')}\n\n## Regole delegate a HVA\n\n${result.hvaRules.join(', ')}\n`
}

async function main() {
  const scriptPath = fileURLToPath(import.meta.url)
  const repoRoot = path.resolve(path.dirname(scriptPath), '../../..')
  const base = resolveBase(repoRoot)
  const head = git(['rev-parse', 'HEAD'], repoRoot)
  const changedFiles = collectChanges(repoRoot, base)
  const result = evaluatePolicy({
    changedFiles,
    prBody: process.env.DESIGN_POLICY_PR_BODY ?? '',
    requireClassification: (process.env.DESIGN_POLICY_EVENT_NAME ?? 'pull_request') === 'pull_request',
  })
  assertIconParity(repoRoot, result)

  const outputDir = path.join(repoRoot, 'product/test-results/design-policy')
  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, 'design-policy.json'), `${JSON.stringify({ ...result, base, head }, null, 2)}\n`)
  const markdown = renderMarkdown(result, base, head)
  fs.writeFileSync(path.join(outputDir, 'design-policy.md'), markdown)
  process.stdout.write(markdown)
  if (result.findings.length) process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
