import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'
const fixtureStatePath = path.join(outputRoot, 'fixture-state.json')
const UDA_FIXTURE_ROUTE = '/progetta/documenti/nuovo/{HVA_UDA_ASSET_ID}'

export const EXPERIENCE_SURFACES = [
  { id: 'planner', label: 'Oggi / Planner', path: '/planner' },
  { id: 'next-lesson-materials', label: 'Materiali della prossima lezione', path: '/materiali/prossima' },
  { id: 'knowledge', label: 'Conoscenza', path: '/knowledge' },
  { id: 'annual-plan', label: 'Piano annuale', path: '/piano-annuale' },
  { id: 'design-first-grade', label: 'Progetta — classe prima', path: '/progetta?grade=prima' },
  { id: 'uda-authoring-entry', label: 'Progetta — ingresso documento UDA', path: UDA_FIXTURE_ROUTE },
  { id: 'classes', label: 'Classi', path: '/classi' },
  { id: 'timetable', label: 'Orario', path: '/orario' },
  { id: 'calendar', label: 'Calendario', path: '/calendario' },
  { id: 'settings', label: 'Impostazioni', path: '/impostazioni' },
  { id: 'settings-textbooks', label: 'Impostazioni — Libri di testo', path: '/impostazioni/libri-di-testo' },
  { id: 'account', label: 'Account e sicurezza', path: '/account' },
  { id: 'account-mfa', label: 'Account e sicurezza — MFA', path: '/account/mfa' },
]

export async function writeExperienceFixtureState({ udaAssetId }) {
  await fsPromises.mkdir(outputRoot, { recursive: true })
  await fsPromises.writeFile(
    fixtureStatePath,
    `${JSON.stringify({ schemaVersion: 1, udaAssetId }, null, 2)}\n`,
  )
}

export function resolveExperienceSurfacePath(surface) {
  if (surface.id !== 'uda-authoring-entry') return surface.path

  const state = readFixtureState()
  const assetId = state?.udaAssetId
  if (!assetId || typeof assetId !== 'string') {
    throw new Error('HVA UDA fixture state is unavailable for uda-authoring-entry')
  }
  return `/progetta/documenti/nuovo/${encodeURIComponent(assetId)}`
}

function readFixtureState() {
  try {
    return JSON.parse(fs.readFileSync(fixtureStatePath, 'utf8'))
  } catch {
    return null
  }
}
