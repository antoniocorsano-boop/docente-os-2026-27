import type { ProvisionalTechnologyGrade, ProvisionalTechnologyReference } from '@/core/domain/cml-provisional-technology-reference'
import { arenaGoogleConnectionMessage } from './arena-google-connection-feedback'

const MASTER_URL = 'https://docs.google.com/document/d/12eWTPUZBJxZixd6-p8drNAaW5_eL8qWpXZUSDyZZAv4/edit'

export function ArenaProvisionalGradePreviewClient({
  section,
  serverReference = null,
  sourceStatus = 'NOT_CONFIGURED',
  googleConnectHref,
  googleState,
}: {
  section: {
    grade: ProvisionalTechnologyGrade
    sectionCode: string
    schoolYearRef: string
  }
  serverReference?: ProvisionalTechnologyReference | null
  sourceStatus?: 'AVAILABLE' | 'NOT_AUTHORIZED' | 'NOT_CONFIGURED' | 'SOURCE_UNAVAILABLE' | 'SOURCE_UNVERIFIED'
  googleConnectHref?: string | null
  googleState?: string | null
}) {
  const preview = serverReference
  const googleFeedback = arenaGoogleConnectionMessage(googleState)
  return (
    <article className="classWorkspaceCard" aria-labelledby="arena-vertical-consultation-heading">
      {googleFeedback ? (
        <p role="status" aria-live="polite"><strong>{googleFeedback}</strong></p>
      ) : null}
      <div>
        <h2 id="arena-vertical-consultation-heading">Curricolo provvisorio di Tecnologia</h2>
        <p>
          Riferimento comune da Arena, distinto dalla programmazione della classe.
          Proposta di lavoro sperimentale, non vigente e non approvata.
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

      {serverReference ? (
        <p role="status">
          <strong>Fonte verificata e consultabile senza file.</strong> La release di Arena è stata
          letta in sola lettura mediante la sessione corrente e confrontata con la sua impronta
          crittografica. Nessun riferimento è stato salvato nella classe.
        </p>
      ) : (
        <>
          <p role="status">
            <strong>{sourceStatus === 'SOURCE_UNVERIFIED'
              ? 'La fonte disponibile non ha superato i controlli.'
              : 'La consegna automatica del curricolo non è ancora disponibile.'}</strong>
            {' '}Il documento integrale resta consultabile; per estrarre i contenuti
            della classe puoi utilizzare la release completa di Arena sul dispositivo.
          </p>
          {googleConnectHref ? (
            <p><a href={googleConnectHref}>Collega Google Drive per consultare automaticamente il curricolo privato</a></p>
          ) : null}
          <p><small>Nessun file da selezionare o caricare manualmente. L'accesso Google è personale e richiede consenso esplicito.</small></p>
        </>
      )}

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
