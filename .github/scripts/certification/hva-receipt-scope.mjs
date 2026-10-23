const CORE_JOURNEY_IDS = ['class-next-task', 'uda-reading', 'knowledge-document', 'calendar-controls']
const LOCAL_ONLY_JOURNEY_IDS = ['today-teacher-first']
const FOCUSED_JOURNEY_IDS_BY_SPEC = new Map([
  ['e2e/experience/contextual-capabilities.spec.mjs', ['ux0e-contextual-capabilities']],
  ['e2e/experience/critical-journeys.spec.mjs', CORE_JOURNEY_IDS],
  ['e2e/experience/today-teacher-first.spec.mjs', LOCAL_ONLY_JOURNEY_IDS],
])

export function resolveHvaReceiptScope({ mode = 'FULL', specs = [], surfaceCount, projectCount, target = 'local' }) {
  const normalizedMode = mode === 'FOCUSED' ? 'FOCUSED' : 'FULL'
  const normalizedTarget = target === 'local' ? 'local' : target === 'preview' ? 'preview' : 'beta'
  const normalizedSpecs = [...new Set((Array.isArray(specs) ? specs : []).map((value) => String(value).trim()).filter(Boolean))]
  const targetJourneyIds = normalizedTarget === 'local' ? [...CORE_JOURNEY_IDS, ...LOCAL_ONLY_JOURNEY_IDS] : [...CORE_JOURNEY_IDS]
  if (normalizedMode === 'FULL') {
    return { mode: 'FULL', target: normalizedTarget, specs: [], expectedObservationCount: surfaceCount * projectCount, expectedJourneyIds: targetJourneyIds, expectedJourneyCount: targetJourneyIds.length * projectCount }
  }
  const specSet = new Set(normalizedSpecs)
  const expectedJourneyIds = [...new Set(normalizedSpecs.flatMap((spec) => FOCUSED_JOURNEY_IDS_BY_SPEC.get(spec) ?? []))]
    .filter((id) => normalizedTarget === 'local' || !LOCAL_ONLY_JOURNEY_IDS.includes(id))
  return { mode: 'FOCUSED', target: normalizedTarget, specs: normalizedSpecs, expectedObservationCount: specSet.has('e2e/experience/surfaces.spec.mjs') ? surfaceCount * projectCount : 0, expectedJourneyIds, expectedJourneyCount: expectedJourneyIds.length * projectCount }
}

export function parseHvaSpecs(value) {
  return String(value ?? '').split(/\s+/).map((item) => item.trim()).filter(Boolean)
}
