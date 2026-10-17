import {
  deriveFinalReportReadiness,
  type FinalReportConsistencyCode,
  type FinalReportEvidenceBundle,
  type FinalReportReadiness,
} from '../../../core/domain/final-report-evidence'

export type FinalReportReadinessViewModel = {
  heading: string
  stateLabel: string
  knownItems: Array<{ label: string; value: string }>
  missingItems: string[]
  warnings: string[]
  primaryAction: { label: string; enabled: boolean }
}

const STATE_LABELS: Record<FinalReportReadiness, string> = {
  DATI_INSUFFICIENTI: 'Dati insufficienti',
  PRONTA_PER_BOZZA: 'Pronta per la bozza',
  RICHIEDE_INTEGRAZIONI: 'Richiede integrazioni',
  PRONTA_PER_REVISIONE: 'Pronta per la revisione',
}

const MISSING_MESSAGES: Partial<Record<FinalReportConsistencyCode, string>> = {
  MISSING_ACTIVE_INSTITUTIONAL_BASE: 'Manca la veste istituzionale attiva per questa relazione.',
  MISSING_ACTIVE_TEMPLATE: 'Manca il modello attivo per la relazione finale.',
  MISSING_DISCIPLINE_CONTEXT: 'Manca la disciplina associata alla relazione.',
}

const WARNING_MESSAGES: Partial<Record<FinalReportConsistencyCode, string>> = {
  PLAN_BLOCK_WITHOUT_SESSION: 'Una parte dichiarata svolta non ha ancora una lezione associata.',
  SESSION_ON_PLANNED_BLOCK: 'Una lezione registrata risulta ancora collegata a una parte indicata come pianificata.',
  UNALLOCATED_SESSION: 'Una lezione registrata non è ancora ricondotta al piano annuale.',
  REMAPPED_BLOCK: 'Il piano contiene una parte rimodulata da considerare nella relazione.',
  RECOVERED_BLOCK: 'Il piano contiene un recupero da considerare nella relazione.',
  CANCELLED_BLOCK: 'Il piano contiene una parte annullata da considerare nella relazione.',
}

export function buildFinalReportReadinessViewModel(bundle: FinalReportEvidenceBundle): FinalReportReadinessViewModel {
  const readiness = deriveFinalReportReadiness(bundle)
  const findingCodes = new Set(readiness.findings.map((finding) => finding.code))

  const missingItems = [
    ...readiness.findings
      .map((finding) => MISSING_MESSAGES[finding.code])
      .filter((message): message is string => Boolean(message)),
    ...bundle.humanRequired,
  ]

  const warnings = readiness.findings
    .map((finding) => WARNING_MESSAGES[finding.code])
    .filter((message): message is string => Boolean(message))

  const knownItems: Array<{ label: string; value: string }> = [
    { label: 'Lezioni registrate', value: String(bundle.executed.sessions.length) },
    { label: 'Tempo documentato', value: formatMinutes(bundle.executed.totalActualMinutes) },
  ]

  if (bundle.executed.supersededSessionCount > 0) {
    knownItems.push({
      label: 'Registrazioni sostituite escluse dal conteggio',
      value: String(bundle.executed.supersededSessionCount),
    })
  }

  const uniqueMissing = [...new Set(missingItems)]
  const uniqueWarnings = [...new Set(warnings)]

  return {
    heading: 'Relazione finale',
    stateLabel: STATE_LABELS[readiness.state],
    knownItems,
    missingItems: uniqueMissing,
    warnings: uniqueWarnings,
    primaryAction: primaryActionFor(readiness.state, findingCodes),
  }
}

function primaryActionFor(
  state: FinalReportReadiness,
  findingCodes: Set<FinalReportConsistencyCode>,
): { label: string; enabled: boolean } {
  if (state === 'DATI_INSUFFICIENTI') {
    return { label: 'Controlla ciò che manca', enabled: false }
  }
  if (state === 'RICHIEDE_INTEGRAZIONI') {
    return { label: 'Controlla le incongruenze', enabled: false }
  }
  if (state === 'PRONTA_PER_BOZZA') {
    return { label: 'Crea bozza', enabled: true }
  }

  const hasWarnings = findingCodes.size > 0
  return { label: hasWarnings ? 'Controlla la relazione' : 'Continua', enabled: true }
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) return 'Nessun tempo registrato'
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${remainder} min`
  if (remainder === 0) return `${hours} h`
  return `${hours} h ${remainder} min`
}
