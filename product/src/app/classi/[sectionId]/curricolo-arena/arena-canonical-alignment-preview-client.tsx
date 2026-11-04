'use client'

import { useRef, useState } from 'react'
import {
  buildPilot2CCanonicalAlignmentPreview,
  type Pilot2CCanonicalAlignmentPreview,
  type Pilot2CLegacyBaseline,
} from '@/core/domain/cml-2c-canonical-alignment'
import { selectArenaVerticalCurricoloSlice } from '@/core/domain/cml-discipline-binding'
import { verifyCanonicalArenaReleaseForThreeGrades } from '@/core/domain/cml-arena-three-grade-preflight'

const CANONICAL_2C_MAX_BYTES = 2_000_000
const REFERENCE_REVISION = '27'
const REFERENCE_SOURCE_FOOTPRINT = '99c4ccc3'

export function ArenaCanonicalAlignmentPreviewClient({
  section,
  legacyBaseline,
}: {
  section: { grade: 'PRIMA' | 'SECONDA' | 'TERZA'; sectionCode: string; schoolYearRef: string }
  legacyBaseline: Pilot2CLegacyBaseline | null
}) {
  const [preview, setPreview] = useState<Pilot2CCanonicalAlignmentPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sequence = useRef(0)

  async function onFile(file: File | null) {
    const request = ++sequence.current
    setPreview(null)
    setError(null)
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
                <p>Requisiti da confrontare, senza dichiarare equivalenze automatiche:</p>
                <ul>
                  {preview.legacy.requirements.map(item => (
                    <li key={item.requirementId}>
                      {item.description} <strong>· Da verificare</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Non risulta una baseline storica nell'attuale contesto di classe. Questo dato non annulla le ricevute professionali precedenti: richiede una verifica separata.</p>
            )}
          </section>

          <section aria-label="Proposta di collegamento didattico">
            <h3>Collegamento proposto: Agricoltura come sistema tecnologico</h3>
            <p>{preview.proposal.text}</p>
            <p role="status"><strong>Da rivalidare dal docente.</strong> Non sono stati modificati obiettivi, materiali, attività o ricevute della 2C.</p>
          </section>
        </div>
      ) : null}
    </article>
  )
}
