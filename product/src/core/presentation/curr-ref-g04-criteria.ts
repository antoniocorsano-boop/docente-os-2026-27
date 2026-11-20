/**
 * CURR-REF-01/G04 — proposta di criteri per il solo blocco B25, v0.1.
 *
 * Raccordo editoriale G03 di TRAMA, non contratto di Registro Docente.
 * Nessuna fonte provvisoria diventa curricolo vigente; nessuna selezione
 * costituisce conferma di una valutazione, persistenza o approvazione collegiale.
 * Sorgente didattica qualificata:
 * human-task-approved-projections-b23-b27.ts blob 4e0493bc161d5c0b7cd50d89f5105604eaf8ee0f
 * G03: docs/research/curr-ref-01-g03-activity-link-v0.1.json
 */
import type { HumanTaskLessonProjection } from './human-task-content'

export type G04Criterion = Readonly<{
  id: 'CR-G01-01' | 'CR-G01-02'
  focus: 'process' | 'argumentation'
  title: string
  description: string
  evidence: string
}>

export type G04Proposal = Readonly<{
  activityId: 'HTC-PRIMA-B25-PLAN-v1'
  udaCode: 'CAN-UDA-1-05'
  blockId: 'B25'
  localMasterReference: 'confrontare soluzioni'
  masterAuthority: 'PROVISIONAL_COMPLETE_NOT_IN_FORCE'
  criteria: readonly G04Criterion[]
}>

const PROPOSAL: G04Proposal = {
  activityId: 'HTC-PRIMA-B25-PLAN-v1',
  udaCode: 'CAN-UDA-1-05',
  blockId: 'B25',
  localMasterReference: 'confrontare soluzioni',
  masterAuthority: 'PROVISIONAL_COMPLETE_NOT_IN_FORCE',
  criteria: [
    {
      id: 'CR-G01-01',
      focus: 'process',
      title: 'Confronto delle alternative',
      description: 'Confronta almeno due alternative con criteri dichiarati e pertinenti.',
      evidence: 'Matrice di confronto con criteri comprensibili e riferiti al problema.',
    },
    {
      id: 'CR-G01-02',
      focus: 'argumentation',
      title: 'Motivazione della scelta',
      description: 'Motiva la scelta in relazione a requisiti e vincoli, distinguendo preferenze da ragioni verificabili.',
      evidence: 'Spiegazione della scelta collegata a dati e vincoli.',
    },
  ],
}

/**
 * Nessun aggancio per semplice corrispondenza di titolo o codice UdA.
 * Quando la proiezione cambia, non mostrare un raccordo potenzialmente obsoleto.
 */
export function resolveG04CriteriaProposal(
  projection: HumanTaskLessonProjection,
): G04Proposal | null {
  if (projection.projectionId !== PROPOSAL.activityId ||
      projection.grade !== 'Prima' ||
      projection.blockId !== PROPOSAL.blockId ||
      projection.udaCode !== '1-05' ||
      projection.udaTitle !== 'Dal problema al progetto' ||
      projection.title !== 'Confrontare e scegliere' ||
      projection.durationMinutes !== 120 ||
      projection.objective !== 'Confrontare le alternative con criteri espliciti di funzionalità, fattibilità, materiali, sicurezza, costo indicativo e riduzione degli sprechi e motivare la scelta finale.' ||
      projection.evidence !== 'Matrice di scelta motivata.' ||
      projection.outcomes.length !== 1 ||
      projection.outcomes[0] !== 'confrontare alternative con una semplice matrice di criteri;' ||
      projection.observation.length !== 1 ||
      projection.observation[0] !== 'Confronta alternative usando criteri espliciti.' ||
      projection.sourceAlignment.level !== 'COMPOSED' ||
      projection.sources.length !== 2 ||
      projection.sources[0]?.code !== 'CAN-PLAN-1' ||
      projection.sources[0]?.role !== 'PLAN' ||
      projection.sources[1]?.code !== 'CAN-UDA-1-05' ||
      projection.sources[1]?.role !== 'UDA') {
    return null
  }
  return PROPOSAL
}

export type G04SessionSelection = Readonly<{
  selectedIds: readonly G04Criterion['id'][]
  confirmedIds: readonly G04Criterion['id'][] | null
}>

export const EMPTY_G04_SELECTION: G04SessionSelection = {
  selectedIds: [],
  confirmedIds: null,
}

export function toggleG04Criterion(
  selection: G04SessionSelection,
  proposal: G04Proposal,
  id: string,
): G04SessionSelection {
  if (!proposal.criteria.some((criterion) => criterion.id === id)) return selection
  const selectedIds = selection.selectedIds.includes(id as G04Criterion['id'])
    ? selection.selectedIds.filter((value) => value !== id)
    : proposal.criteria.filter((criterion) => (
        selection.selectedIds.includes(criterion.id) || criterion.id === id
      )).map((criterion) => criterion.id)
  return { selectedIds, confirmedIds: null }
}

export function confirmG04Selection(
  selection: G04SessionSelection,
  proposal: G04Proposal,
): G04SessionSelection {
  const normalized = proposal.criteria
    .filter((criterion) => selection.selectedIds.includes(criterion.id))
    .map((criterion) => criterion.id)
  if (selection.selectedIds.length === 0 ||
      normalized.length !== selection.selectedIds.length ||
      normalized.some((id, index) => selection.selectedIds[index] !== id)) {
    return { selectedIds: [], confirmedIds: null }
  }
  return { selectedIds: [...selection.selectedIds], confirmedIds: [...selection.selectedIds] }
}

export function isG04SessionConfirmed(selection: G04SessionSelection): boolean {
  return selection.confirmedIds !== null &&
    selection.confirmedIds.length > 0 &&
    selection.confirmedIds.length === selection.selectedIds.length &&
    selection.confirmedIds.every((id, index) => id === selection.selectedIds[index])
}
