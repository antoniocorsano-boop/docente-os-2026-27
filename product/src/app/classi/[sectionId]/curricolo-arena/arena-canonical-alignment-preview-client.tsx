'use client'

import { useRef, useState } from 'react'
import {
  buildPilot2CCanonicalAlignmentPreview,
  type Pilot2CCanonicalAlignmentPreview,
  type Pilot2CLegacyBaseline,
} from '@/core/domain/cml-2c-canonical-alignment'
import { selectArenaVerticalCurricoloSlice } from '@/core/domain/cml-discipline-binding'
import { verifyCanonicalArenaReleaseForThreeGrades } from '@/core/domain/cml-arena-three-grade-preflight'
import {
  plan2CCanonicalReferenceDecision,
  type Pilot2CReferenceChoice,
  type Pilot2CReferenceDecisionBlocker,
} from '@/core/domain/cml-2c-reference-link-decision'

const CANONICAL_2C_MAX_BYTES = 2_000_000
const REFERENCE_REVISION = '27'
const REFERENCE_SOURCE_FOOTPRINT = '99c4ccc3'

export function ArenaCanonicalAlignmentPreviewClient({
  section,
  legacyBaseline,
  p7ReceiptVerified,
}: {
  section: { grade: 'PRIMA' | 'SECONDA' | 'TERZA'; sectionCode: string; schoolYearRef: string }
  legacyBaseline: Pilot2CLegacyBaseline | null
  p7ReceiptVerified: boolean
}) {
  const [preview, setPreview] = useState<Pilot2CCanonicalAlignmentPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [choice, setChoice] = useState<Pilot2CReferenceChoice | null>(null)
  const sequence = useRef(0)

  async function onFile(file: File | null) {
    const request = ++sequence.current
    setPreview(null)
    setError(null)
    setChoice(null)
    if (!file) return
    if (file.size > CANONICAL_2C_MAX_BYTES || file.size === 0) {
      setError('Il documento supera il limite di confronto o è vuoto.')
      return
    }
    try {
      // Data stays in this browser. The full master never enters a server action,
      // storage or component state: only the detached comparison is retained.
      const release: unknown = JSON.parse(await file.text())
      if (!release || typeof release !== 'object' || Array.isArray(release)) {
        throw new Error('Invalid local release')
      }
      const declaredInstitutionId = (release as Record<string, unknown>).institutionId
      if (typeof declaredInstitutionId !== 'string' || !declaredInstitutionId.trim()) {
        throw new Error('Missing declared institution')
      }
      verifyCanonicalArenaReleaseForThreeGrades({
        release,
        targetInstitutionId: declaredInstitutionId,
        schoolYearRef: section.schoolYearRef,
        expectedRevisionId: REFERENCE_REVISION,
        expectedSourceContentFootprint: REFERENCE_SOURCE_FOOTPRINT,
      })
      const selected = selectArenaVerticalCurricoloSlice({
        release,
        target: {
          institutionId: declaredInstitutionId,
          schoolYearRef: section.schoolYearRef,
          schoolOrder: 'secondaria',
          gradeRef: 'grade-2',
          disciplineRef: 'technology',
        },
      })
      const comparison = buildPilot2CCanonicalAlignmentPreview({
        selected,
        section,
        legacyBaseline,
      })
      if (sequence.current === request) setPreview(comparison)
    } catch {
      if (sequence.current === request) {
        setError('Il pacchetto non è utilizzabile per il confronto 2C. Controlla origine, revisione e integrità del file Arena.')
      }
    }
  }

  // The loaded local JSON is a comparison only. There is intentionally no
  // institutional binding, server-qualified source or persistence action here.
  const decision = preview ? plan2CCanonicalReferenceDecision({
    scope: { ...section, disciplineRef: 'technology' },
    choice,
    baseline: legacyBaseline ? {
      sourceHandoffFootprintHash: legacyBaseline.sourceHandoffFootprintHash,
      alignmentAuthority: legacyBaseline.alignmentAuthority,
      acceptedAt: legacyBaseline.acceptedAt,
    } : null,
    documentedP7ReceiptVerified: p7ReceiptVerified,
    source: {
      status: 'LOCAL_PREVIEW',
      institutionId: preview.provenance.institutionIdDeclared,
      sourceMasterVersion: preview.provenance.sourceVersion,
      sourceRevisionId: REFERENCE_REVISION,
      sourceContentFootprint: REFERENCE_SOURCE_FOOTPRINT,
      releaseStructuralFootprint: preview.provenance.releaseStructuralFootprint,
      segmentId: preview.canonical.segmentId,
      framework: preview.scope.framework,
      authorityState: 'PROVISIONAL_COMPLETE',
      curricoloVigente: preview.provenance.curricoloVigente,
    },
    institutionBinding: { status: 'NOT_ATTESTED' },
    identityContext: { expectedSchoolCode: null, expectedArenaInstitutionId: null },
  }) : null

  return (
    <article className="classWorkspaceCard" aria-labelledby="arena-canonical-2c-title">
      <div>
        <h2 id="arena-canonical-2c-title">Confronta con il curricolo verticale</h2>
        <p>Una verifica in sola lettura per Tecnologia 2C. La progettazione già confermata resta invariata.</p>
      </div>

      <label>
        <span>Release canonica Arena v1.3, revisione 27 (file JSON locale)</span>
        <input
          type="file"
          accept=".json,application/json"
          onChange={event => { void onFile(event.target.files?.[0] ?? null) }}
        />
      </label>
      <p><small>Il file è letto soltanto su questo dispositivo. Nessun contenuto viene inviato o salvato.</small></p>
      {error ? <p role="alert"><strong>Confronto non disponibile.</strong> {error}</p> : null}

      {preview ? (
        <div className="classAssignmentList" aria-live="polite">
          <div className="classAssignmentItem">
            <div><strong>Fonte Arena</strong><span>Versione {preview.provenance.sourceVersion} · Tecnologia II</span></div>
            <small>Indicazioni 2012 · baseline provvisoria, non vigente</small>
          </div>
          <div className="classAssignmentItem">
            <div><strong>Provenienza dichiarata</strong><span>{preview.provenance.institutionIdDeclared}</span></div>
            <small>Identità del workspace non ancora verificata; nessuna adozione consentita da questa pagina</small>
          </div>
          <div className="classAssignmentItem">
            <div><strong>Impronta della release</strong><span>{preview.provenance.releaseStructuralFootprint}</span></div>
            <small>{preview.canonical.nodeCount} nodi · segmento {preview.canonical.segmentId}</small>
          </div>

          <section aria-label="Obiettivi e conoscenze del curricolo Arena">
            <h3>Nel curricolo Arena</h3>
            <p><strong>Obiettivi</strong></p>
            <ul>{preview.canonical.obiettivi.map((s, i) => <li key={i}>{s}</li>)}</ul>
            <p><strong>Conoscenze</strong></p>
            <ul>{preview.canonical.conoscenze.map((s, i) => <li key={i}>{s}</li>)}</ul>
            <p><strong>Evidenze attese</strong></p>
            <ul>{preview.canonical.evidenze.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </section>

          <section aria-label="Riferimenti della baseline 2C conservata">
            <h3>Nella progettazione 2C</h3>
            {preview.legacy ? (
              <>
                <p>Baseline precedente conservata: impronta <code>{preview.legacy.sourceHandoffFootprintHash}</code>.</p>
                <p>Vincoli storici della progettazione da confrontare, senza dichiarare equivalenze automatiche:</p>
                <ul>
                  {preview.legacy.reviewedConstraints.map(item => (
                    <li key={item.id}>
                      {item.description} <strong>· Da verificare</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Non risulta una baseline storica nel contesto di classe corrente. Questo dato non annulla le ricevute professionali precedenti: richiede una verifica separata.</p>
            )}
          </section>

          <section aria-label="Proposta di collegamento didattico">
            <h3>Collegamento proposto: Agricoltura come sistema tecnologico</h3>
            <p>{preview.proposal.text}</p>
            <p role="status"><strong>Da rivalidare dal docente.</strong> Non sono stati modificati obiettivi, materiali, attività o ricevute della 2C.</p>
          </section>
          <section aria-label="Scelta preliminare sul riferimento Tecnologia II">
            <h3>Quale riferimento usare nella 2C?</h3>
            <p>Questa scelta è soltanto una simulazione locale per esaminare le conseguenze: non viene registrata, inviata né applicata alla classe.</p>
            <div className="arena2cReviewChoices">
              <button
                type="button"
                className="arena2cReviewChoice"
                aria-pressed={choice === 'KEEP_CURRENT_REFERENCE'}
                onClick={() => setChoice('KEEP_CURRENT_REFERENCE')}
              >
                Mantieni il riferimento attuale
              </button>
              <button
                type="button"
                className="arena2cReviewChoice"
                aria-pressed={choice === 'REQUEST_PROVISIONAL_REFERENCE'}
                onClick={() => setChoice('REQUEST_PROVISIONAL_REFERENCE')}
              >
                Esamina il nuovo riferimento provvisorio
              </button>
            </div>
            {decision?.status === 'KEEP_CURRENT_NO_CHANGE' ? (
              <p role="status"><strong>Nessuna modifica prevista.</strong> La baseline del pilota P7, la preparazione e i materiali restano invariati. Questa scelta non è stata salvata.</p>
            ) : null}
            {decision?.status === 'REVIEW_BLOCKED' ? (
              <div role="status">
                <p><strong>Collegamento non attivabile da questa anteprima.</strong> Prima di confermare nella 2C occorre:</p>
                <ul>{decision.blockers.map(blocker => (
                  <li key={blocker}>{referenceBlockerLabel(blocker)}</li>
                ))}</ul>
                <p>Il nuovo curricolo non è vigente e nessuna decisione professionale è stata registrata.</p>
              </div>
            ) : null}
            {decision?.status === 'AWAITING_AUTHENTICATED_CONFIRMATION' ? (
              <p role="status">Le verifiche preliminari sono coerenti. Occorrono ancora una conferma autenticata e una nuova ricevuta, senza sovrascrivere la precedente.</p>
            ) : null}
          </section>
        </div>
      ) : null}
    </article>
  )
}

function referenceBlockerLabel(blocker: Pilot2CReferenceDecisionBlocker): string {
  switch (blocker) {
    case 'P7_RECEIPT_NOT_VERIFIED':
      return 'Verificare la ricevuta della preparazione storica P7.'
    case 'NO_HISTORICAL_BASELINE':
      return 'Individuare la baseline già utilizzata dalla 2C.'
    case 'HISTORICAL_BASELINE_DRIFT':
      return 'Ricontrollare la versione esatta della baseline storica.'
    case 'HISTORICAL_AUTHORITY_CHANGED':
      return 'Rivedere lo stato di autorità della baseline precedente.'
    case 'SOURCE_NOT_SERVER_QUALIFIED':
      return 'Ottenere la release di Arena attraverso un canale verificato dal server.'
    case 'SOURCE_REFERENCE_MISMATCH':
      return 'Controllare versione, revisione, impronte e segmento Tecnologia II.'
    case 'INSTITUTION_BINDING_NOT_ATTESTED':
      return 'Attestare il collegamento fra istituto scolastico e identificativo Arena.'
    case 'INSTITUTION_ID_MISMATCH':
      return 'Risolvere la differenza fra gli identificativi degli istituti.'
  }
}
