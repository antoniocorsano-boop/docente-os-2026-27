import fs from 'node:fs/promises'
import path from 'node:path'
import { EXPERIENCE_SURFACES } from '../../e2e/experience/surfaces.mjs'

const outputDir = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'
const observationsDir = path.join(outputDir, 'observations')
const journeysDir = path.join(outputDir, 'journeys')
const receiptDir = path.join(outputDir, 'receipt')
const target = process.env.EXPERIENCE_TARGET ?? 'local'
const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'
const commit = process.env.EXPECTED_COMMIT ?? process.env.GITHUB_SHA ?? 'local-working-tree'
const testExitCode = Number(process.env.EXPERIENCE_TEST_EXIT_CODE ?? 0)
const expectedProjects = ['mobile-412x915', 'desktop-1440x1000']
const expectedJourneyIds = ['class-next-task', 'uda-reading', 'knowledge-document', 'calendar-controls']

const observations = await readJsonDirectory(observationsDir)
const journeys = await readJsonDirectory(journeysDir)
const deployment = await readJson(path.join(outputDir, 'deployment.json'))
const expectedObservationCount = EXPERIENCE_SURFACES.length * expectedProjects.length
const expectedJourneyCount = expectedJourneyIds.length * expectedProjects.length
const missingObservationCount = Math.max(0, expectedObservationCount - observations.length)
const missingJourneyCount = Math.max(0, expectedJourneyCount - journeys.length)
const failedJourneys = journeys.filter((item) => item.status === 'FAIL')
const notApplicableJourneys = journeys.filter((item) => item.status === 'NOT_APPLICABLE')

const consoleIssueCount = observations.reduce((sum, item) => sum + item.consoleErrors.length + item.pageErrors.length, 0)
const requestFailureCount = observations.reduce((sum, item) => sum + item.requestFailures.length, 0)
const ignoredFrameworkAbortCount = observations.reduce((sum, item) => sum + (item.ignoredRequestFailures?.length ?? 0), 0)
const serverErrorCount = observations.reduce((sum, item) => sum + item.httpErrors.filter((error) => error.status >= 500).length, 0)
const clientHttpIssueCount = observations.reduce((sum, item) => sum + item.httpErrors.filter((error) => error.status >= 400 && error.status < 500).length, 0)
const overflowCount = observations.filter((item) => item.horizontalOverflow > 1).length
const smallTargetObservations = observations.filter((item) => item.project.startsWith('mobile') && item.smallInteractiveTargets.length > 0)

const gates = {
  productCi: 'EXTERNAL',
  deployment: target === 'beta' ? (deployment?.status ?? 'FAIL') : 'NOT_APPLICABLE',
  browser: testExitCode === 0 && missingObservationCount === 0 ? 'PASS' : 'FAIL',
  journeys: missingJourneyCount === 0 && failedJourneys.length === 0 ? 'PASS' : 'FAIL',
  console: consoleIssueCount === 0 ? 'PASS' : 'FAIL',
  network: requestFailureCount === 0 && serverErrorCount === 0 ? 'PASS' : 'FAIL',
  layout: overflowCount === 0 ? 'PASS' : 'FAIL',
  mobileTargets: smallTargetObservations.length === 0 ? 'PASS' : 'WATCH',
  visual: 'REVIEW_REQUIRED',
}

const findings = []
if (missingObservationCount) findings.push({ severity: 'FAIL', code: 'HVA-COVERAGE', message: `${missingObservationCount} osservazioni attese non sono state prodotte.` })
if (missingJourneyCount) findings.push({ severity: 'FAIL', code: 'HVA-JOURNEY-COVERAGE', message: `${missingJourneyCount} ricevute journey attese non sono state prodotte.` })
if (failedJourneys.length) findings.push({ severity: 'FAIL', code: 'HVA-JOURNEY', message: `${failedJourneys.length} journey Human risultano falliti.` })
if (consoleIssueCount) findings.push({ severity: 'FAIL', code: 'HVA-CONSOLE', message: `${consoleIssueCount} errori console/page rilevati.` })
if (requestFailureCount || serverErrorCount) findings.push({ severity: 'FAIL', code: 'HVA-NETWORK', message: `${requestFailureCount} richieste fallite e ${serverErrorCount} risposte 5xx.` })
if (overflowCount) findings.push({ severity: 'FAIL', code: 'HVA-OVERFLOW', message: `${overflowCount} superfici producono overflow orizzontale della pagina.` })
if (clientHttpIssueCount) findings.push({ severity: 'WATCH', code: 'HVA-HTTP-4XX', message: `${clientHttpIssueCount} risposte HTTP 4xx da ispezionare.` })
if (smallTargetObservations.length) findings.push({ severity: 'WATCH', code: 'HVA-MOBILE-TARGET', message: `${smallTargetObservations.length} superfici mobili contengono controlli visibili inferiori a 36 px in almeno una dimensione.` })

const automaticFailure = Object.values(gates).includes('FAIL')
const overall = automaticFailure ? 'FAIL' : findings.some((item) => item.severity === 'WATCH') ? 'WATCH' : 'REVIEW_REQUIRED'

const receipt = {
  schemaVersion: 2,
  system: 'DOCENTE_OS_HUMAN_VISUAL_ACCEPTANCE',
  generatedAt: new Date().toISOString(),
  commit,
  target,
  baseUrl,
  overall,
  gates,
  coverage: {
    surfaces: EXPERIENCE_SURFACES.map(({ id, label, path: route }) => ({ id, label, route })),
    projects: expectedProjects,
    expectedObservations: expectedObservationCount,
    actualObservations: observations.length,
    expectedJourneys: expectedJourneyCount,
    actualJourneys: journeys.length,
  },
  journeys,
  metrics: {
    consoleIssueCount,
    requestFailureCount,
    ignoredFrameworkAbortCount,
    serverErrorCount,
    clientHttpIssueCount,
    overflowCount,
    mobileSmallTargetSurfaceCount: smallTargetObservations.length,
    journeyNotApplicableCount: notApplicableJourneys.length,
  },
  deployment: deployment ?? null,
  findings,
  visualReview: {
    status: 'REVIEW_REQUIRED',
    instruction: 'Osservare gli screenshot e classificare gerarchia, densità, stato, azioni e comportamento mobile secondo product/design/VISUAL-ACCEPTANCE.md.',
  },
}

await fs.mkdir(receiptDir, { recursive: true })
await fs.writeFile(path.join(receiptDir, 'acceptance.json'), `${JSON.stringify(receipt, null, 2)}\n`)
await fs.writeFile(path.join(receiptDir, 'acceptance.md'), markdown(receipt))
process.stdout.write(`${markdown(receipt)}\n`)

async function readJsonDirectory(dir) {
  try {
    const files = (await fs.readdir(dir)).filter((name) => name.endsWith('.json')).sort()
    return (await Promise.all(files.map((name) => readJson(path.join(dir, name))))).filter(Boolean)
  } catch {
    return []
  }
}

async function readJson(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) } catch { return null }
}

function markdown(value) {
  const gateRows = Object.entries(value.gates).map(([key, state]) => `| ${key} | **${state}** |`).join('\n')
  const findingRows = value.findings.length
    ? value.findings.map((item) => `- **${item.severity} · ${item.code}** — ${item.message}`).join('\n')
    : '- Nessun finding automatico.'
  const journeyRows = value.journeys.length
    ? value.journeys.map((item) => `| ${item.project} | ${item.label} | **${item.status}** | ${item.note ?? ''} |`).join('\n')
    : '| — | — | **MISSING** | Nessuna ricevuta journey. |'
  const frameworkNote = value.metrics.ignoredFrameworkAbortCount
    ? `\n- **Abort di framework registrati e ignorati:** ${value.metrics.ignoredFrameworkAbortCount} (solo pattern Next.js esplicitamente ammessi).`
    : ''
  return `# Human + Visual Acceptance Receipt\n\n- **Commit:** \`${value.commit}\`\n- **Target:** ${value.target}\n- **Base URL:** ${value.baseUrl}\n- **Esito automatico complessivo:** **${value.overall}**\n- **Evidenze:** ${value.coverage.actualObservations}/${value.coverage.expectedObservations} osservazioni · ${value.coverage.actualJourneys}/${value.coverage.expectedJourneys} journey${frameworkNote}\n\n| Gate | Stato |\n| --- | --- |\n${gateRows}\n\n## Journey Human\n\n| Viewport | Percorso | Stato | Evidenza |\n| --- | --- | --- | --- |\n${journeyRows}\n\n## Finding automatici\n\n${findingRows}\n\n## Giudizio visuale\n\n**REVIEW_REQUIRED** — gli screenshot devono essere osservati secondo \`product/design/VISUAL-ACCEPTANCE.md\`.\n`
}
