'use client'

import { useRef, useState } from 'react'
import { selectArenaVerticalCurricoloSlice } from '@/core/domain/cml-discipline-binding'
import { verifyCanonicalArenaReleaseForThreeGrades } from '@/core/domain/cml-arena-three-grade-preflight'
import {
  projectProvisionalTechnologyReference,
  provisionalTechnologyGradeRef,
  type ProvisionalTechnologyGrade,
  type ProvisionalTechnologyReference,
} from '@/core/domain/cml-provisional-technology-reference'

const MAX_RELEASE_BYTES = 2_000_000
const SOURCE_REVISION = '27'
const SOURCE_FOOTPRINT = '99c4ccc3'
const MASTER_URL = 'https://docs.google.com/document/d/12eWTPUZBJxZixd6-p8drNAaW5_eL8qWpXZUSDyZZAv4/edit'

export function ArenaProvisionalGradePreviewClient({
  section,
}: {
  section: {
    grade: ProvisionalTechnologyGrade
    sectionCode: string
    schoolYearRef: string
  }
}) {
  const [preview, setPreview] = useState<ProvisionalTechnologyReference | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const sequence = useRef(0)

  async function onFile(file: File | null) {
    const request = ++sequence.current
    setPreview(null)
    setError(null)
    setReading(false)
    if (!file) return
    if (file.size === 0 || file.size > MAX_RELEASE_BYTES) {
      setError('Il file Arena è vuoto oppure supera il limite previsto per la consultazione.')
      return
    }
    setReading(true)
    try {
      // Source is read solely by the browser. No upload, write, receipt or
      // persistence. Only the detached grade-specific projection is retained.
      const release: unknown = JSON.parse(await file.text())
      if (!release || typeof release !== 'object' || Array.isArray(release)) {
        throw new Error('Invalid release')
      }
      const institutionId = (release as Record<string, unknown>).institutionId
      if (typeof institutionId !== 'string' || !institutionId.trim()) {
        throw new Error('No declared institution')
      }
      verifyCanonicalArenaReleaseForThreeGrades({
        release,
        targetInstitutionId: institutionId,
        schoolYearRef: section.schoolYearRef,
        expectedRevisionId: SOURCE_REVISION,
        expectedSourceContentFootprint: SOURCE_FOOTPRINT,
      })
      const selected = selectArenaVerticalCurricoloSlice({
        release,
        target: {
          institutionId,
          schoolYearRef: section.schoolYearRef,
          schoolOrder: 'secondaria',
          gradeRef: provisionalTechnologyGradeRef(section.grade),
          disciplineRef: 'technology',
        },
      })
      const detached = projectProvisionalTechnologyReference({
        selected,
        grade: section.grade,
        schoolYearRef: section.schoolYearRef,
      })
      if (sequence.current === request) setPreview(detached)
    } catch {
      if (sequence.current === request) {
        setError('Impossibile verificare la release per questa classe. Controlla provenienza, integrità, revisione e anno scolastico del file Arena.')
      }
    } finally {
      if (sequence.current === request) setReading(false)
    }
  }

  return (
    <article className="classWorkspaceCard" aria-labelledby="arena-vertical-consultation-heading">
      <div>
        <h2 id="arena-vertical-consultation-heading">Curricolo provvisorio di Tecnologia</h2>
        <p>
          Riferimento comune da Arena, distinto dalla programmazione della classe.
          Il documento non è ancora approvato dal Collegio dei docenti.
        </p>
      </div>
      <div className="classAssignmentList">
        <div className="classAssignmentItem">
          <div>
            <strong>Annualità</strong>
            <span>{section.grade.toLocaleLowerCase('it')} · sezione {section.sectionCode}</span>
          </div>
          <small>{section.grade === 'PRIMA' ? 'Indicazioni 2025' : 'Indicazioni 2012 · regime transitorio'}</small>
        </div>
        <div className="classAssignmentItem">
          <div><strong>Fonte unica</strong><span>Arena · master 1.3 · revisione 27</span></div>
          <small>Provvisorio · non vigente</small>
        </div>
      </div>

      <p>
        <a href={MASTER_URL} target="_blank" rel="noopener noreferrer">
          Consulta il curricolo verticale integrale
        </a>
      </p>

      <label>
        <span>Esamina la release verificabile di Arena (file JSON)</span>
        <input
          type="file"
          accept=".json,application/json"
          aria-label="Seleziona la release completa di Arena per il confronto in sola lettura"
          onChange={event => { void onFile(event.target.files?.[0] ?? null) }}
        />
      </label>
      <p><small>
        La consultazione del documento integrale è immediata; per estrarre il segmento della classe serve
        la release completa di Arena. Il file viene letto solo sul dispositivo, senza invio o salvataggio.
      </small></p>

      {reading ? <p role="status" aria-live="polite">Verifica della fonte e dell'annualità in corso…</p> : null}
      {error ? <p role="alert">{error} Nessuna progettazione è stata modificata.</p> : null}

      {preview ? (
        <div className="classAssignmentList" aria-live="polite">
          <div className="classAssignmentItem">
            <div><strong>Riferimento individuato</strong><span>Tecnologia · {section.grade.toLocaleLowerCase('it')}</span></div>
            <small>{preview.framework} · provvisorio, non vigente</small>
          </div>
          <div className="classAssignmentItem">
            <div><strong>Fonte dichiarata</strong><span>{preview.institutionIdDeclared}</span></div>
            <small>Identità istituzionale non attestata dal caricamento locale</small>
          </div>
          <div className="classAssignmentItem">
            <div><strong>Integrità della release</strong><span>{preview.releaseStructuralFootprint}</span></div>
            <small>{preview.nodeCount} nodi del segmento · nessuna associazione salvata</small>
          </div>
          <section aria-label="Obiettivi curricolari di Tecnologia">
            <h3>Obiettivi</h3>
            <ul>{preview.obiettivi.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </section>
          {preview.conoscenze.length ? (
            <section aria-label="Conoscenze curricolari">
              <h3>Conoscenze</h3>
              <ul>{preview.conoscenze.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </section>
          ) : null}
          <section aria-label="Evidenze attese del curricolo">
            <h3>Evidenze attese</h3>
            <ul>{preview.evidenze.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </section>
          <p role="status">
            <strong>Consultazione completata in sola lettura.</strong> Questa fonte è utilizzabile come
            riferimento provvisorio per elaborare la progettazione, ma non è stata adottata,
            approvata né associata automaticamente alla classe.
          </p>
        </div>
      ) : null}
    </article>
  )
}
