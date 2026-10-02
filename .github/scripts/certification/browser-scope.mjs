const FULL_HVA_PATHS = [
  /^product\/src\/app\/layout\.tsx$/,
  /^product\/src\/app\/globals\.css$/,
  /^product\/src\/components\/app-shell\//,
  /^product\/design\//,
  /^product\/playwright\.experience\.config\.mjs$/,
  /^product\/e2e\/support\/e2e-auth\.mjs$/,
]

const FOCUSED_RULES = [
  {
    test: (path) =>
      path.startsWith('product/src/app/knowledge/') ||
      path.startsWith('product/src/app/share-target/') ||
      path === 'product/src/app/manifest.ts' ||
      path === 'product/public/sw.js' ||
      path.includes('/PwaServiceWorkerRegistration'),
    specs: [
      'e2e/experience/surfaces.spec.mjs',
      'e2e/experience/contextual-capabilities.spec.mjs',
      'e2e/experience/timetable-import-real-fixture.spec.mjs',
    ],
  },
  {
    test: (path) => path.startsWith('product/src/app/classi/'),
    specs: [
      'e2e/experience/classroom-cockpit.spec.mjs',
      'e2e/experience/contextual-capabilities.spec.mjs',
      'e2e/experience/lesson-register.spec.mjs',
    ],
  },
  {
    test: (path) => path.startsWith('product/src/app/orario/'),
    specs: [
      'e2e/experience/surfaces.spec.mjs',
      'e2e/experience/timetable-import-real-fixture.spec.mjs',
    ],
  },
  {
    test: (path) => path.startsWith('product/src/app/calendario/'),
    specs: ['e2e/experience/surfaces.spec.mjs'],
  },
  {
    test: (path) => path.startsWith('product/src/app/planner/'),
    specs: ['e2e/experience/surfaces.spec.mjs'],
  },
]

const SUPPORT_HVA_SPECS = new Map([
  ['product/e2e/fixtures/timetable-real-shape-28-09-2026.pdf.b64', [
    'e2e/experience/timetable-import-real-fixture.spec.mjs',
  ]],
  ['product/e2e/fixtures/timetable-real-shape-28-09-2026.expected.json', [
    'e2e/experience/timetable-import-real-fixture.spec.mjs',
  ]],
  ['product/e2e/support/classroom-material-fixture.mjs', [
    'e2e/experience/classroom-cockpit.spec.mjs',
    'e2e/experience/contextual-capabilities.spec.mjs',
    'e2e/experience/lesson-register.spec.mjs',
  ]],
  ['product/e2e/support/experience-uda-fixture.mjs', [
    'e2e/experience/surfaces.spec.mjs',
    'e2e/experience/lesson-materials.spec.mjs',
    'e2e/experience/lesson-materials-standard-pack.spec.mjs',
  ]],
  ['product/e2e/support/knowledge-fixture-hygiene.mjs', [
    'e2e/experience/surfaces.spec.mjs',
    'e2e/experience/contextual-capabilities.spec.mjs',
  ]],
  ['product/e2e/support/lesson-register-timing-fixture.mjs', [
    'e2e/experience/lesson-register.spec.mjs',
  ]],
  ['product/e2e/support/direct-aal2-supabase.mjs', [
    'e2e/experience/classroom-cockpit.spec.mjs',
    'e2e/experience/contextual-capabilities.spec.mjs',
    'e2e/experience/lesson-register.spec.mjs',
  ]],
])

const SUPPORT_GATE_DEPENDENCIES = new Map([
  ['product/e2e/support/classroom-material-fixture.mjs', ['HVA']],
  ['product/e2e/support/experience-uda-fixture.mjs', ['HVA']],
  ['product/e2e/support/knowledge-fixture-hygiene.mjs', ['HVA']],
  ['product/e2e/support/lesson-register-timing-fixture.mjs', ['HVA']],
  ['product/e2e/support/direct-aal2-supabase.mjs', ['HVA', 'X4_PLANNER_WRITE']],
  ['product/e2e/support/e2e-auth.mjs', ['HVA', 'WCAG_2_2_AA', 'P6_PERFORMANCE', 'X4_PLANNER_WRITE']],
])

export function browserSupportGateDependencies(path) {
  return SUPPORT_GATE_DEPENDENCIES.get(path) ?? null
}

export function deriveHvaScope(paths, { hvaRequired = false, conservative = false } = {}) {
  if (!hvaRequired) {
    return { mode: 'NONE', specs: [], projects: [] }
  }

  const normalized = [...new Set((paths ?? []).map((path) => String(path).trim()).filter(Boolean))]

  if (conservative || normalized.some((path) => FULL_HVA_PATHS.some((pattern) => pattern.test(path)))) {
    return { mode: 'FULL', specs: [], projects: ['mobile-412x915', 'desktop-1440x1000'] }
  }

  const specs = new Set()
  let sawRuntimeUi = false

  for (const path of normalized) {
    if (path.startsWith('product/src/app/') || path.startsWith('product/src/components/') || path.startsWith('product/public/')) {
      sawRuntimeUi = true
      const rule = FOCUSED_RULES.find((candidate) => candidate.test(path))
      if (!rule) {
        return { mode: 'FULL', specs: [], projects: ['mobile-412x915', 'desktop-1440x1000'] }
      }
      for (const spec of rule.specs) specs.add(spec)
    }

    for (const spec of SUPPORT_HVA_SPECS.get(path) ?? []) specs.add(spec)
  }

  if (!sawRuntimeUi && specs.size === 0) {
    return { mode: 'FULL', specs: [], projects: ['mobile-412x915', 'desktop-1440x1000'] }
  }

  return {
    mode: 'FOCUSED',
    specs: [...specs].sort(),
    projects: ['mobile-412x915', 'desktop-1440x1000'],
  }
}


if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const fs = await import('node:fs')
  const receiptPath = process.argv[2]
  const hvaRequired = process.argv[3] === 'true'
  if (!receiptPath) {
    process.stderr.write('receipt path required\n')
    process.exit(2)
  }
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
  const scope = deriveHvaScope(receipt.changedFiles ?? [], {
    hvaRequired,
    conservative: receipt.conservative === true,
  })
  process.stdout.write(`${JSON.stringify(scope)}\n`)
}
