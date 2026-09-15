const ALL_DIMENSIONS = [
  'ui',
  'accessibility',
  'planner_write',
  'performance',
  'security',
  'runtime',
  'certification_contract',
]

const ALL_HEAVY_GATES = [
  'HVA',
  'WCAG_2_2_AA',
  'P6_PERFORMANCE',
  'X4_PLANNER_WRITE',
  'ASVS_5_0',
]

const CENTRAL_ORCHESTRATION_PATHS = new Set([
  '.github/workflows/product-ci.yml',
  '.github/workflows/certification-impact.yml',
  '.github/workflows/browser-certification-orchestrator.yml',
  '.github/workflows/governed-mfa-queue-hygiene.yml',
  'docs/architecture/CERTIFICATION_PIPELINE_V2_CANONICAL.md',
])

const GATE_WORKFLOW_PATHS = new Map([
  ['.github/workflows/experience-acceptance.yml', ['HVA']],
  ['.github/workflows/wcag22-aa-assurance.yml', ['WCAG_2_2_AA']],
  ['.github/workflows/p6-performance.yml', ['P6_PERFORMANCE']],
  ['.github/workflows/x4-planner-e2e.yml', ['X4_PLANNER_WRITE']],
  ['.github/workflows/asvs50-assurance.yml', ['ASVS_5_0']],
])

function normalizePath(path) {
  return String(path ?? '').trim().replaceAll('\\', '/').replace(/^\.\//, '')
}

function addImpact(state, dimension, path, reason) {
  state.impacts[dimension] = true
  state.reasons[dimension].push({ path, reason })
}

function requireGate(state, gate, path, reason) {
  state.forcedGates.add(gate)
  state.gateReasons[gate].push({ path, reason })
}

function requireAllHeavyGates(state, path, reason) {
  for (const gate of ALL_HEAVY_GATES) requireGate(state, gate, path, reason)
}

function isTestFile(path) {
  return /(?:\.test\.[cm]?[jt]sx?|\.spec\.[cm]?[jt]sx?)$/.test(path) || path.includes('/e2e/')
}

function classifyKnownPath(path, state) {
  let known = false

  const certificationContract =
    CENTRAL_ORCHESTRATION_PATHS.has(path) ||
    GATE_WORKFLOW_PATHS.has(path) ||
    path.startsWith('.github/scripts/certification/')

  if (certificationContract) {
    known = true
    addImpact(state, 'certification_contract', path, 'certification policy or implementation changed')

    if (CENTRAL_ORCHESTRATION_PATHS.has(path) || path.startsWith('.github/scripts/certification/')) {
      requireAllHeavyGates(state, path, 'central certification orchestration changed: one-time full assurance required')
    }

    for (const gate of GATE_WORKFLOW_PATHS.get(path) ?? []) {
      requireGate(state, gate, path, 'gate workflow contract changed')
    }
  }

  const ui =
    (path.startsWith('product/src/app/') && !path.startsWith('product/src/app/api/')) ||
    path.startsWith('product/src/components/') ||
    path.startsWith('product/design/') ||
    path.startsWith('product/experience/') ||
    path.startsWith('product/e2e/experience/')

  if (ui) {
    known = true
    addImpact(state, 'ui', path, 'user-facing surface or experience contract changed')
    addImpact(state, 'accessibility', path, 'user-facing surface may change accessible behavior')
  }

  const plannerWrite =
    path.startsWith('product/src/app/api/assistant/planner-write/') ||
    path === 'product/src/core/application/assistant-write-contract.ts' ||
    path === 'product/src/core/application/assistant-write-contract.test.ts' ||
    path === 'product/src/core/infrastructure/supabase/supabase-planner-repository.ts' ||
    path === 'product/e2e/x3-acceptance.spec.mjs' ||
    path === 'product/e2e/x4-planner-write.spec.mjs' ||
    path === '.github/workflows/x4-planner-e2e.yml'

  if (plannerWrite) {
    known = true
    addImpact(state, 'planner_write', path, 'Planner mutation boundary or its acceptance evidence changed')
    addImpact(state, 'security', path, 'confirmed write boundary is security-sensitive')
  }

  const performance =
    /^product\/src\/app\/(?!.*\.test\.)[^/]+(?:\/.*)?\/(?:page|layout|route)\.[jt]sx?$/.test(path) ||
    /^product\/src\/app\/(?:page|layout|route)\.[jt]sx?$/.test(path) ||
    path.startsWith('product/src/core/infrastructure/') ||
    path === 'product/package-lock.json' ||
    path === 'product/package.json' ||
    path === 'product/next.config.ts' ||
    path === 'product/next.config.mjs' ||
    path === 'product/scripts/start-production.mjs' ||
    path === 'product/e2e/p6-performance-baseline.spec.mjs' ||
    path === '.github/workflows/p6-performance.yml'

  if (performance) {
    known = true
    addImpact(state, 'performance', path, 'route, infrastructure, dependency or performance contract changed')
  }

  const security =
    path.startsWith('product/src/core/security/') ||
    path.includes('/auth/') ||
    path.startsWith('product/src/app/login/') ||
    path.startsWith('product/src/app/api/auth/') ||
    path.startsWith('product/supabase/migrations/') ||
    path === 'product/package-lock.json' ||
    path === '.github/workflows/asvs50-assurance.yml' ||
    path === '.github/workflows/dependency-security.yml'

  if (security) {
    known = true
    addImpact(state, 'security', path, 'authentication, authorization, migration or dependency boundary changed')
  }

  const runtime =
    (path.startsWith('product/src/') && !isTestFile(path)) ||
    path === 'product/package.json' ||
    path === 'product/package-lock.json' ||
    path.startsWith('product/scripts/') ||
    path.startsWith('product/public/') ||
    path === 'render.yaml'

  if (runtime) {
    known = true
    addImpact(state, 'runtime', path, 'runtime-delivered product state changed')
  }

  const knownTestOrEvidence =
    isTestFile(path) ||
    path.startsWith('product/test-results/') ||
    path.startsWith('ops/')

  if (knownTestOrEvidence) known = true

  const inertDocumentation = path.startsWith('docs/') && !certificationContract
  if (inertDocumentation) known = true

  return known
}

function deriveRequiredGates(impacts, conservative, forcedGates) {
  if (conservative) return [...ALL_HEAVY_GATES]

  const gates = new Set(forcedGates)
  if (impacts.ui || impacts.runtime) gates.add('HVA')
  if (impacts.accessibility) gates.add('WCAG_2_2_AA')
  if (impacts.performance) gates.add('P6_PERFORMANCE')
  if (impacts.planner_write) gates.add('X4_PLANNER_WRITE')
  if (impacts.security) gates.add('ASVS_5_0')
  return [...gates]
}

export function classifyCertificationImpact(paths) {
  const changedFiles = [...new Set((paths ?? []).map(normalizePath).filter(Boolean))].sort()
  const state = {
    impacts: Object.fromEntries(ALL_DIMENSIONS.map((dimension) => [dimension, false])),
    reasons: Object.fromEntries(ALL_DIMENSIONS.map((dimension) => [dimension, []])),
    unknownRelevantFiles: [],
    forcedGates: new Set(),
    gateReasons: Object.fromEntries(ALL_HEAVY_GATES.map((gate) => [gate, []])),
  }

  for (const path of changedFiles) {
    const known = classifyKnownPath(path, state)
    const relevant = path.startsWith('product/') || path.startsWith('.github/') || path === 'render.yaml'
    if (!known && relevant) state.unknownRelevantFiles.push(path)
  }

  const conservative = state.unknownRelevantFiles.length > 0
  if (conservative) {
    for (const path of state.unknownRelevantFiles) {
      for (const dimension of ALL_DIMENSIONS) {
        addImpact(state, dimension, path, 'unknown relevant file: fail-closed full certification')
      }
      requireAllHeavyGates(state, path, 'unknown relevant file: fail-closed full certification')
    }
  }

  return {
    schema: 'certification-impact.v1',
    changedFiles,
    impacts: state.impacts,
    reasons: state.reasons,
    unknownRelevantFiles: state.unknownRelevantFiles,
    conservative,
    requiredGates: deriveRequiredGates(state.impacts, conservative, state.forcedGates),
    gateReasons: state.gateReasons,
    orchestrationAuthorized: true,
    advisoryOnly: false,
    mergeAuthorized: false,
  }
}
