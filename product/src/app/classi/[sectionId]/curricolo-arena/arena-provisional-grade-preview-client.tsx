'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type {
  ProvisionalTechnologyGrade, ProvisionalTechnologyReference,
} from '@/core/domain/cml-provisional-technology-reference'
import {
  createCurricoloWorkProposal,
  curricoloReadingExcerpts,
  searchCurricoloExcerpts,
  type CurricoloFacet,
  type CurricoloWorkKind,
  type CurricoloWorkProposal,
} from '@/core/domain/cml-curricolo-workbench'
import { arenaGoogleConnectionMessage } from './arena-google-connection-feedback'
import { saveArenaUdaInProgetta } from './curricolo-uda-save-actions'
import styles from './arena-curricolo-workbench.module.css'

const ORIGINAL_SOURCE_URL = 'https://drive.google.com/file/d/1r6CUQ0ziNEHSnttJ7tgeoOCkUZpOQg6-/view'
const KINDS: readonly { id: CurricoloWorkKind; label: string }[] = [
  { id: 'ATTIVITA', label: 'Attività' },
  { id: 'LEZIONE', label: 'Lezione' },
  { id: 'UDA', label: 'UDA' },
  { id: 'PERCORSO', label: 'Percorso' },
]
const FACETS: readonly { id: CurricoloFacet; label: string }[] = [
  { id: 'obiettivi', label: 'Obiettivi' },
  { id: 'conoscenze', label: 'Conoscenze' },
  { id: 'evidenze', label: 'Evidenze attese' },
]

export function ArenaProvisionalGradePreviewClient({
  sectionId, section, serverReference = null, sourceStatus = 'NOT_CONFIGURED', googleConnectHref, googleState,
}: {
  sectionId: string
  section: { grade: ProvisionalTechnologyGrade; sectionCode: string; schoolYearRef: string }
  serverReference?: ProvisionalTechnologyReference | null
  sourceStatus?: 'AVAILABLE' | 'NOT_AUTHORIZED' | 'NOT_CONFIGURED' | 'SOURCE_UNAVAILABLE' | 'SOURCE_UNVERIFIED'
  googleConnectHref?: string | null
  googleState?: string | null
}) {
  const [startMode, setStartMode] = useState<'curricolo' | 'tema'>('curricolo')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [workKind, setWorkKind] = useState<CurricoloWorkKind>('ATTIVITA')
  const [theme, setTheme] = useState('')
  const [evidence, setEvidence] = useState('')
  const [draft, setDraft] = useState<CurricoloWorkProposal | null>(null)
  const [showSource, setShowSource] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, startSave] = useTransition()
  const router = useRouter()
  const googleFeedback = arenaGoogleConnectionMessage(googleState)
  const entries = useMemo(
    () => serverReference ? curricoloReadingExcerpts(serverReference) : [],
    [serverReference],
  )
  const matches = useMemo(() => searchCurricoloExcerpts(entries, query), [entries, query])
  const selected = entries.find(item => item.id === selectedId) ?? null
  const evidenceEntries = entries.filter(item => item.facet === 'evidenze')

  function startDraft() {
    if (!serverReference || !selected) return
    setDraft(createCurricoloWorkProposal({
      reference: serverReference, selected, kind: workKind, theme,
      evidence,
    }))
  }

  function saveInProgetta() {
    if (!draft || draft.kind !== 'UDA' || !selectedId) return
    setSaveError(null)
    startSave(async () => {
      try {
        const result = await saveArenaUdaInProgetta({
          sectionId,
          excerptId: selectedId,
          sourceEvidence: evidence,
          editable: {
            title: draft.title,
            theme: draft.theme,
            objective: draft.objective,
            evidence: draft.evidence,
            task: draft.task,
            resources: draft.resources,
            duration: draft.duration,
            steps: draft.steps,
            observation: draft.observation,
          },
        })
        router.push(result.href)
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Salvataggio non riuscito: riprova')
      }
    })
  }

  function updateDraft<K extends keyof Pick<CurricoloWorkProposal,
    'title' | 'theme' | 'objective' | 'evidence' | 'task' | 'resources' | 'duration' | 'steps' | 'observation'
  >>(key: K, value: CurricoloWorkProposal[K]) {
    setDraft(current => current ? { ...current, [key]: value } : null)
  }

  return (
    <article className={styles.workbench} aria-labelledby="arena-vertical-consultation-heading">
      <div className={styles.heading}>
        <p className={styles.eyebrow}>ARENA · CURRICOLO DI LAVORO</p>
        <h2 id="arena-vertical-consultation-heading">Tecnologia · {section.grade.toLocaleLowerCase('it')}</h2>
        <p>Obiettivi ed evidenze come punto di partenza per la tua progettazione.</p>
        <small>Master 1.3, revisione 27 · proposta provvisoria, non vigente e non approvata · {section.schoolYearRef}</small>
      </div>

      {googleFeedback ? <p role="status" className={styles.notice}><strong>{googleFeedback}</strong></p> : null}

      {!serverReference ? (
        <section className={styles.gate} aria-label="Stato della fonte curricolare">
          <h3>Collega la fonte per consultare il curricolo</h3>
          <p role="status">{sourceStatus === 'SOURCE_UNVERIFIED'
            ? 'La copia Arena non ha superato la verifica di integrità. Nessun testo viene mostrato.'
            : sourceStatus === 'NOT_AUTHORIZED'
              ? 'La consultazione non è autorizzata per questa classe o questo account.'
              : 'La fonte privata Arena non è ancora collegata a questo ambiente di prova.'}</p>
          {googleConnectHref ? (
            <a className={styles.primaryLink} href={googleConnectHref}>
              Collega Google Drive in sola lettura
            </a>
          ) : null}
          <small>Nessun caricamento manuale. Il collegamento richiede consenso personale e verifica della fonte originale.</small>
        </section>
      ) : (
        <>
          <p role="status" className={styles.verified}>Fonte originale verificata. Consultazione in sola lettura, senza adozione né salvataggi automatici.</p>

          {!draft ? (
            <>
              <section className={styles.entry} aria-label="Scegli come iniziare">
                <div className={styles.modeChoices} role="group" aria-label="Punto di partenza">
                  <button type="button" aria-pressed={startMode === 'curricolo'}
                    className={startMode === 'curricolo' ? styles.activeMode : ''}
                    onClick={() => { setStartMode('curricolo'); setQuery('') }}>
                    Parto dal curricolo
                  </button>
                  <button type="button" aria-pressed={startMode === 'tema'}
                    className={startMode === 'tema' ? styles.activeMode : ''}
                    onClick={() => { setStartMode('tema'); setQuery('') }}>
                    Parto da un argomento
                  </button>
                </div>
                <label className={styles.searchLabel} htmlFor="arena-curricolo-query">
                  {startMode === 'tema' ? 'Quale argomento vuoi affrontare?' : 'Cerca un obiettivo, una conoscenza o un’evidenza'}
                </label>
                <input id="arena-curricolo-query" type="search" className={styles.search}
                  value={query} onChange={event => { setQuery(event.target.value); setSelectedId(null) }}
                  placeholder={startMode === 'tema' ? 'Es. energia, materiali, filiere…' : 'Cerca nel curricolo verificato…'} />
                {startMode === 'tema' ? <p className={styles.helper}>
                  La ricerca individua soltanto riferimenti presenti nella fonte, senza inventare corrispondenze.
                </p> : null}
              </section>

              <section aria-label="Riferimenti curricolari individuati" className={styles.results}>
                {FACETS.map(facet => {
                  const items = matches.filter(item => item.facet === facet.id)
                  return items.length ? (
                    <div key={facet.id}>
                      <h3>{facet.label} <small>({items.length})</small></h3>
                      <div className={styles.excerptList}>
                        {items.map(item => (
                          <button type="button" key={item.id}
                            aria-pressed={selectedId === item.id}
                            className={selectedId === item.id ? styles.selectedItem : styles.excerpt}
                            onClick={() => {
                              setSelectedId(item.id)
                              setEvidence('')
                              if (startMode === 'tema' && query.trim()) setTheme(query.trim())
                              else setTheme(item.text)
                            }}>
                            <span>{item.text}</span>
                            <small>{item.editorialExcerpt ? 'Estratto di lettura · testo Arena disponibile' : 'Testo Arena'}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null
                })}
                {!matches.length ? (
                  <p role="status" className={styles.notice}>Nessun riferimento corrispondente. Prova un altro termine: non vengono creati obiettivi non presenti in Arena.</p>
                ) : null}
              </section>

              {selected ? (
                <section className={styles.selected} aria-label="Dettaglio del riferimento selezionato">
                  <p className={styles.eyebrow}>RIFERIMENTO SELEZIONATO</p>
                  <h3>{selected.text}</h3>
                  <p className={styles.helper}>Questa è {selected.editorialExcerpt ? 'una parte testuale della formulazione originale' : 'la formulazione originale'}; non costituisce un nuovo obiettivo ufficiale.</p>
                  <details className={styles.sourceDetail}>
                    <summary>Leggi il testo integrale della fonte</summary>
                    <p>{selected.originalText}</p>
                  </details>
                  <label className={styles.searchLabel} htmlFor="arena-draft-theme">Tema di lavoro (modificabile)</label>
                  <input id="arena-draft-theme" className={styles.search} value={theme}
                    onChange={event => setTheme(event.target.value)} maxLength={200} />
                  <label className={styles.searchLabel} htmlFor="arena-evidence">Evidenza da osservare</label>
                  <select id="arena-evidence" className={styles.search} value={evidence}
                    onChange={event => setEvidence(event.target.value)}>
                    <option value="">Da scegliere durante la progettazione</option>
                    {evidenceEntries.map(item => <option key={item.id} value={item.text}>{item.text}</option>)}
                  </select>
                  <label className={styles.searchLabel} htmlFor="arena-draft-kind">Che cosa vuoi preparare?</label>
                  <select id="arena-draft-kind" className={styles.search} value={workKind}
                    onChange={event => setWorkKind(event.target.value as CurricoloWorkKind)}>
                    {KINDS.map(kind => <option key={kind.id} value={kind.id}>{kind.label}</option>)}
                  </select>
                  <button type="button" className={styles.primary} onClick={startDraft}>
                    Usa per progettare
                  </button>
                </section>
              ) : null}
            </>
          ) : (
            <section className={styles.draft} aria-label="Bozza didattica modificabile">
              <div>
                <p className={styles.eyebrow}>PROPOSTA DEL DOCENTE · NON SALVATA</p>
                <h3>Prepara {KINDS.find(item => item.id === draft.kind)?.label.toLocaleLowerCase('it')}</h3>
                <p>Il testo Arena rimane invariato. Modifica liberamente la proposta prima di confermarla nel tuo lavoro.</p>
              </div>
              {([
                ['title', 'Titolo'],
                ['theme', 'Tema o contesto'],
                ['objective', 'Obiettivo di lavoro'],
                ['evidence', 'Evidenza attesa'],
                ['task', 'Compito o situazione'],
                ['resources', 'Risorse e materiali'],
                ['duration', 'Durata prevista'],
                ['steps', 'Fasi di lavoro'],
                ['observation', 'Osservazione e verifica'],
              ] as const).map(([key, label]) => (
                <label key={key} className={styles.draftField}>
                  <strong>{label}</strong>
                  {key === 'task' || key === 'steps' || key === 'observation' ? (
                    <textarea value={draft[key]} rows={3}
                      placeholder={key === 'task' ? 'Descrivi il compito concreto e il prodotto degli alunni…' : undefined}
                      onChange={event => updateDraft(key, event.target.value)} />
                  ) : (
                    <input value={draft[key]} onChange={event => updateDraft(key, event.target.value)} />
                  )}
                </label>
              ))}
              <details className={styles.sourceDetail}>
                <summary>Provenienza verificabile</summary>
                <p>Arena · master {draft.source.sourceVersion} · {draft.source.framework} · {draft.source.segmentId}.</p>
                <p>Fonte autentica, non vigente: {draft.source.originalText}</p>
              </details>
              {draft.kind === 'UDA' ? (
                <>
                  <p className={styles.helper}>La conferma richiede titolo, obiettivo, evidenza e compito concreti. Crea una UDA personale in Progetta, con versione e provenienza Arena; non modifica la fonte e non crea attività per gli studenti.</p>
                  <button type="button" className={styles.primary} onClick={saveInProgetta} disabled={saving || !draft.title.trim() || !draft.objective.trim() || !draft.evidence.trim() || !draft.task.trim()}>
                    {saving ? 'Salvataggio in corso…' : 'Salva UDA in Progetta'}
                  </button>
                  {saveError ? <p role="alert" className={styles.notice}>{saveError}</p> : null}
                </>
              ) : (
                <p role="status" className={styles.notice}>Questa proposta è modificabile qui, ma il salvataggio integrato di attività, lezioni e percorsi verrà aggiunto dopo la verifica del raccordo con le funzioni esistenti.</p>
              )}
              <button type="button" className={styles.secondary} onClick={() => setDraft(null)}>
                Torna ai riferimenti
              </button>
            </section>
          )}

          <button type="button" className={styles.sourceToggle}
            aria-expanded={showSource} onClick={() => setShowSource(value => !value)}>
            {showSource ? 'Nascondi' : 'Mostra'} origine e dettagli della fonte
          </button>
          {showSource ? (
            <section className={styles.sourceInfo} aria-label="Origine curricolare">
              <p>Fonte unica: Arena · master 1.3 · revisione 27 · {serverReference.framework}.</p>
              <p>Identità istituzionale dichiarata: {serverReference.institutionIdDeclared}. Non costituisce attestazione di approvazione.</p>
              <p>Impronta strutturale: <code>{serverReference.releaseStructuralFootprint}</code></p>
              <a href={ORIGINAL_SOURCE_URL} target="_blank" rel="noopener noreferrer">Apri la copia originale in Google Drive</a>
            </section>
          ) : null}
        </>
      )}
    </article>
  )
}
