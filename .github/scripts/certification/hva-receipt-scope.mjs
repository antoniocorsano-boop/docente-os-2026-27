const LOCAL_FULL_JOURNEY_IDS = ['class-next-task', 'uda-reading', 'knowledge-document', 'calendar-controls', 'today-teacher-first']
const REMOTE_FULL_JOURNEY_IDS = LOCAL_FULL_JOURNEY_IDS.filter((id) => id !== 'today-teacher-first')

const FOCUSED_JOURNEY_IDS_BY_SPEC = new Map([
  ['e2e/experience/contextual-capabilities.spec.mjs', ['ux0e-contextual-capabilities']],
  ['e2e/experience/critical-journeys.spec.mjs', REMOTE_FULL_JOURNEY_IDS],
  ['e2e/experience/today-teacher-first.spec.mjs', ['today-teacher-first']],
])

export function resolveHvaReceiptScope({
  target = 'local',
  mode = 'FULL',
  specs = [],
  surfaceCount,
  projectCount,
}) {
  const normalizedTarget = target === 'beta' || target === 'preview' ? target : 'local'
  const normalizedMode = mode === 'FOCUSED' ? 'FOCUSED' : 'FULL'
  const normalizedSpecs = [...new Set((Array.isArray(specs) ? specs : [])
    .map((value) => String(value).trim())
    .filter(Boolean))]
  const localOnlyJourneyAllowed = normalizedTarget === 'local'

  if (normalizedMode === 'FULL') {
    const expectedJourneyIds = localOnlyJourneyAllowed
      ? [...LOCAL_FULL_JOURNEY_IDS]
      : [...REMOTE_FULL_JOURNEY_IDS]
    return {
      target: normalizedTarget,
      mode: 'FULL',
      specs: [],
      expectedObservationCount: surfaceCount * projectCount,
      expectedJourneyIds,
      expectedJourneyCount: expectedJourneyIds.length * projectCount,
    }
  }

  const specSet = new Set(normalizedSpecs)
  const expectedJourneyIds = [...new Set(
    normalizedSpecs.flatMap((spec) => FOCUSED_JOURNEY_IDS_BY_SPEC.get(spec) ?? []),
  )].filter((id) => localOnlyJourneyAllowed || id !== 'today-teacher-first')

  return {
    target: normalizedTarget,
    mode: 'FOCUSED',
    specs: normalizedSpecs,
    expectedObservationCount: specSet.has('e2e/experience/surfaces.spec.mjs')
      ? surfaceCount * projectCount
      : 0,
    expectedJourneyIds,
    expectedJourneyCount: expectedJourneyIds.length * projectCount,
  }
}

export function parseHvaSpecs(value) {
  return String(value ?? '').split(/\s+/).map((item) => item.trim()).filter(Boolean)
}
