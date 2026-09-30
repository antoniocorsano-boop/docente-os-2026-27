const FULL_JOURNEY_IDS = ['class-next-task', 'uda-reading', 'knowledge-document', 'calendar-controls']

const FOCUSED_JOURNEY_IDS_BY_SPEC = new Map([
  ['e2e/experience/contextual-capabilities.spec.mjs', ['ux0e-contextual-capabilities']],
  ['e2e/experience/critical-journeys.spec.mjs', FULL_JOURNEY_IDS],
])

export function resolveHvaReceiptScope({
  mode = 'FULL',
  specs = [],
  surfaceCount,
  projectCount,
}) {
  const normalizedMode = mode === 'FOCUSED' ? 'FOCUSED' : 'FULL'
  const normalizedSpecs = [...new Set((Array.isArray(specs) ? specs : [])
    .map((value) => String(value).trim())
    .filter(Boolean))]

  if (normalizedMode === 'FULL') {
    return {
      mode: 'FULL',
      specs: [],
      expectedObservationCount: surfaceCount * projectCount,
      expectedJourneyIds: [...FULL_JOURNEY_IDS],
      expectedJourneyCount: FULL_JOURNEY_IDS.length * projectCount,
    }
  }

  const specSet = new Set(normalizedSpecs)
  const expectedJourneyIds = [...new Set(
    normalizedSpecs.flatMap((spec) => FOCUSED_JOURNEY_IDS_BY_SPEC.get(spec) ?? []),
  )]

  return {
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
