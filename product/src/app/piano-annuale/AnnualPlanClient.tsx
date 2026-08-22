'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import type {
  AnnualPlanBlockStatus,
  AnnualPlanExecutionSnapshot,
  AnnualPlanSection,
  AnnualPlanSectionStatus,
} from '@/core/domain/annual-plan-execution'
import {
  addAnnualPlanSection,
  confirmAnnualPlanSection,
  resetAnnualPlanProgress,
  saveAnnualPlanProgress,
} from './actions'
import {
  buildBlocks,
  CANONICAL_PLAN_SOURCES,
  GRADE_UI,
  type GradeKey,
} from './model'

type SectionRecord = {
  id: string
  code: string
  status: AnnualPlanSectionStatus
  source: string
}

type ProgressEntry = {
  status: AnnualPlanBlockStatus
  date: string
  note: string
}

type StoredState = {
  sections: Record<GradeKey, SectionRecord[]>
  progress: Record<string, ProgressEntry>
}

const BLOCK_STATUSES: AnnualPlanBlockStatus[] = ['PIANIFICATO', 'SVOLTO', 'RECUPERATO', 'RIMODULATO', 'ANNULLATO']
const COMPLETE_STATUSES = new Set<AnnualPlanBlockStatus>(['SVOLTO', 'RECUPERATO', 'RIMODULATO'])
const GRADES: GradeKey[] = ['Prima', 'Seconda', 'Terza']

export default function AnnualPlanClient({
  initialSnapshot,
  academicYearId,
}: {
  initialSnapshot: AnnualPlanExecutionSnapshot
  academicYearId: string
}) {
  const [state, setState] = useState<StoredState>(() => snapshotToState(initialSnapshot))
  const [grade, setGrade] = useState<GradeKey>('Prima')
  const [sectionId, setSectionId] = useState('')
  const [newSection, setNewSection] = useState('')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const storageKey = `DOCENTE_OS_CAN_PLAN_CACHE_${academicYearId}`

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state, storageKey])

  const blocks = useMemo(() => buildBlocks(grade), [grade])
  const source = CANONICAL_PLAN_SOURCES[grade]
  const selectedSection = state.sections[grade].find((item) => item.id === sectionId) ?? null

  const progressFor = (blockId: string): ProgressEntry => {
    if (!selectedSection) return emptyProgress()
    return state.progress[progressKey(selectedSection.id, source.generationId, blockId)] ?? emptyProgress()
  }

  const completed = selectedSection ? blocks.filter((block) => COMPLETE_STATUSES.has(progressFor(block.id).status)) : []
  const nextBlock = blocks.find((block) => {
    const status = progressFor(block.id).status
    return !COMPLETE_STATUSES.has(status) && status !== 'ANNULLATO'
  })

  function updateLocalProgress(blockId: string, entry: ProgressEntry) {
    if (!selectedSection) return
    const key = progressKey(selectedSection.id, source.generationId, blockId)
    setState((current) => ({
      ...current,
      progress: { ...current.progress, [key]: entry },
    }))
  }

  function persistProgressEntry(blockId: string, entry: ProgressEntry) {
    if (!selectedSection) return
    const currentSection = selectedSection
    setSyncError(null)
    startTransition(async () => {
      try {
        const saved = await saveAnnualPlanProgress({
          grade,
          sectionId: currentSection.id,
          blockId,
          status: entry.status,
          date: entry.date,
          note: entry.note,
        })
        const key = progressKey(saved.sectionId, saved.canonicalGenerationId, saved.blockId)
        setState((current) => ({
          ...current,
          progress: {
            ...current.progress,
            [key]: {
              status: saved.status,
              date: saved.executedOn ?? '',
              note: saved.evidenceNote ?? '',
            },
          },
        }))
      } catch (error) {
        setSyncError(errorMessage(error))
      }
    })
  }

  function applyAndPersist(blockId: string, patch: Partial<ProgressEntry>) {
    const next = { ...progressFor(blockId), ...patch }
    updateLocalProgress(blockId, next)
    persistProgressEntry(blockId, next)
  }

  function markNextDone() {
    if (!selectedSection || !nextBlock) return
    const current = progressFor(nextBlock.id)
    applyAndPersist(nextBlock.id, {
      status: 'SVOLTO',
      date: current.date || currentRomeDate(),
    })
  }

  function addSection() {
    const code = normalizeSectionCode(newSection)
    if (!code || state.sections[grade].some((item) => item.code === code)) return
    setSyncError(null)
    startTransition(async () => {
      try {
        const saved = await addAnnualPlanSection(grade, code)
        const record = sectionToRecord(saved)
        setState((current) => ({
          ...current,
          sections: {
            ...current.sections,
            [grade]: [...current.sections[grade], record].sort((a, b) => a.code.localeCompare(b.code)),
          },
        }))
        setSectionId(saved.id)
        setNewSection('')
      } catch (error) {
        setSyncError(errorMessage(error))
      }
    })
  }

  function confirmSection() {
    if (!selectedSection) return
    const currentSectionId = selectedSection.id
    setSyncError(null)
    startTransition(async () => {
      try {
        const saved = await confirmAnnualPlanSection(currentSectionId)
        const record = sectionToRecord(saved)
        setState((current) => ({
          ...current,
          sections: {
            ...current.sections,
            [grade]: current.sections[grade].map((item) => item.id === record.id ? record : item),
          },
        }))
      } catch (error) {
        setSyncError(errorMessage(error))
      }
    })
  }

  function resetSection() {
    if (!selectedSection) return
    if (!window.confirm(`Azzera i dati di avanzamento correnti per ${grade} ${selectedSection.code}?`)) return
    const currentSection = selectedSection
    setSyncError(null)
    startTransition(async () => {
      try {
        await resetAnnualPlanProgress(grade, currentSection.id)
        const prefix = `${currentSection.id}|${source.generationId}|`
        setState((current) => ({
          ...current,
          progress: Object.fromEntries(Object.entries(current.progress).filter(([key]) => !key.startsWith(prefix))),
        }))
      } catch (error) {
        setSyncError(errorMessage(error))
      }
    })
  }

  const saveStateLabel = syncError
    ? `Non sono riuscito a salvare le ultime modifiche: ${syncError}. Puoi riprovare.`
    : isPending
      ? 'Sto salvando le modifiche…'
      : 'Modifiche salvate'

  return (
    <>
      <section className="annualHero annualHeroClarified">
        <div>
          <p className="contextLine">Didattica annuale · registro di attuazione</p>
          <h1>Piano annuale</h1>
          <p>Qui segui <strong>cosa insegnare</strong> e <strong>quanto hai realmente svolto</strong> per ogni classe e sezione. Le date registrate documentano l’esecuzione: il Calendario delle occorrenze reali resta un oggetto distinto.</p>
        </div>
        <Link className="secondaryButton" href={`/knowledge/${source.assetId}`}>Apri il documento di riferimento</Link>
      </section>

      <section className="workObjectGuide annualWorkObjectGuide" aria-label="Ruolo del Piano annuale nel sistema">
        <div><span>ATTIVITÀ</span><strong>Oggi</strong><small>Cose da fare e priorità.</small></div>
        <div className="active"><span>QUI</span><strong>Piano annuale</strong><small>Sequenza didattica B01–B33 e avanzamento.</small></div>
        <div><span>SETTIMANA</span><strong>Orario</strong><small>Pattern ricorrente delle lezioni.</small></div>
        <div className="future"><span>DATE REALI · T3</span><strong>Calendario</strong><small>Occorrenze, eventi ed eccezioni effettive.</small></div>
      </section>

      <section className="annualContextPanel">
        <div className="annualSelectors">
          <label>
            <span>Classe</span>
            <select value={grade} onChange={(event) => { setGrade(event.target.value as GradeKey); setSectionId('') }}>
              {GRADES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Sezione</span>
            <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
              <option value="">Vista generale</option>
              {state.sections[grade].map((item) => <option key={item.id} value={item.id}>{grade} {item.code}</option>)}
            </select>
          </label>
        </div>
        <div className="annualSectionState">
          {selectedSection ? (
            <>
              <StatusBadge status={selectedSection.status} />
              <span>{selectedSection.source}</span>
              {selectedSection.status !== 'CONFERMATA' ? <button className="inlineAction" type="button" onClick={confirmSection} disabled={isPending}>Conferma assegnazione</button> : null}
            </>
          ) : (
            <span>{grade === 'Prima' ? 'Le nuove sezioni di prima non sono ancora note: le aggiungerai quando avrai l’assegnazione.' : 'Stai guardando il piano generale della classe. Seleziona una sezione per registrare l’avanzamento effettivo.'}</span>
          )}
        </div>
        <div className="annualAddSection">
          <input value={newSection} onChange={(event) => setNewSection(event.target.value)} placeholder="Nuova sezione, es. A" aria-label="Nuova sezione" />
          <button className="secondaryButton" type="button" onClick={addSection} disabled={isPending || !newSection.trim()}>Aggiungi sezione</button>
        </div>
      </section>

      <section className="annualMetrics" aria-label="Avanzamento annuale">
        <Metric value={`${completed.length}/33`} label="blocchi completati" />
        <Metric value={`${completed.length * 2}/66`} label="ore registrate" />
        <Metric value={nextBlock?.id ?? 'CHIUSO'} label="prossimo blocco" />
        <div className="annualSourceMetric">
          <span>Documento di riferimento</span>
          <strong>{source.code}</strong>
          <small>fonte canonica collegata in Conoscenza</small>
        </div>
      </section>

      <section className="annualActions">
        <button className="primaryButton" type="button" onClick={markNextDone} disabled={isPending || !selectedSection || !nextBlock}>Segna svolto il prossimo blocco</button>
        <button className="secondaryButton" type="button" onClick={resetSection} disabled={isPending || !selectedSection}>Azzera avanzamento sezione</button>
        <span className={`annualSaveState${syncError ? ' syncError' : ''}`}>{saveStateLabel}</span>
      </section>

      <section className="annualTableCard">
        <div className="annualTableHeader">
          <div><h2>Sequenza didattica</h2><p>Se una lezione salta, il blocco resta aperto e passa automaticamente alla prima lezione utile.</p></div>
          <span>{blocks.length} blocchi · 66 ore</span>
        </div>
        <div className="annualTableWrap">
          <table className="annualTable">
            <thead><tr><th>Blocco</th><th>UDA</th><th>Pacchetto</th><th>Periodo</th><th>Focus</th><th>Stato</th><th>Data svolta</th><th>Evidenza / nota</th></tr></thead>
            <tbody>
              {blocks.map((block) => {
                const progress = progressFor(block.id)
                return (
                  <tr key={block.id} className={COMPLETE_STATUSES.has(progress.status) ? 'annualDoneRow' : ''}>
                    <td><strong>{block.id}</strong></td>
                    <td>{block.uda}</td>
                    <td><span className="annualPackChip">{block.pack}</span></td>
                    <td>{block.period}</td>
                    <td>{block.focus}</td>
                    <td>
                      {selectedSection ? (
                        <select value={progress.status} onChange={(event) => applyAndPersist(block.id, { status: event.target.value as AnnualPlanBlockStatus })} aria-label={`Stato ${block.id}`} disabled={isPending}>
                          {BLOCK_STATUSES.map((status) => <option key={status} value={status}>{blockStatusLabel(status)}</option>)}
                        </select>
                      ) : <span className="annualNeutralStatus">Pianificato</span>}
                    </td>
                    <td>{selectedSection ? <input type="date" value={progress.date} onChange={(event) => applyAndPersist(block.id, { date: event.target.value })} aria-label={`Data ${block.id}`} disabled={isPending} /> : '—'}</td>
                    <td>{selectedSection ? <input value={progress.note} onChange={(event) => updateLocalProgress(block.id, { ...progress, note: event.target.value })} onBlur={(event) => persistProgressEntry(block.id, { ...progressFor(block.id), note: event.currentTarget.value })} placeholder="Prodotto, verifica, recupero…" aria-label={`Evidenza ${block.id}`} maxLength={4000} /> : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="annualRulesGrid">
        <article><h2>Come scorre il piano</h2><p>Una lezione saltata non consuma il blocco. Il lavoro previsto passa alla prima lezione utile, evitando di duplicare ore o valutazioni.</p></article>
        <article><h2>Come registro l’avanzamento</h2><p>Ogni sezione mantiene il proprio percorso effettivo. Le modifiche vengono salvate mentre lavori e restano collegate al documento di riferimento usato in quel momento.</p></article>
      </section>

      <details className="technicalDetails annualTechnicalDetails">
        <summary><span><strong>Dettagli tecnici</strong><small>Persistenza e versione del documento di riferimento</small></span><b aria-hidden>＋</b></summary>
        <div className="technicalDetailsBody">
          <div className="technicalMetaLine"><span>Codice fonte: <strong>{source.code}</strong></span><span>Generazione: <strong>{source.generationId}</strong></span><span>Cache browser: <strong>{storageKey}</strong></span></div>
          <p className="panelIntro">L’avanzamento principale è persistito sul servizio dati. La copia nel browser serve soltanto come cache locale di supporto.</p>
        </div>
      </details>
    </>
  )
}

function snapshotToState(snapshot: AnnualPlanExecutionSnapshot): StoredState {
  const sections: StoredState['sections'] = { Prima: [], Seconda: [], Terza: [] }
  for (const section of snapshot.sections) {
    sections[GRADE_UI[section.grade]].push(sectionToRecord(section))
  }
  for (const grade of GRADES) sections[grade].sort((a, b) => a.code.localeCompare(b.code))

  const progress: StoredState['progress'] = {}
  for (const entry of snapshot.progress) {
    progress[progressKey(entry.sectionId, entry.canonicalGenerationId, entry.blockId)] = {
      status: entry.status,
      date: entry.executedOn ?? '',
      note: entry.evidenceNote ?? '',
    }
  }
  return { sections, progress }
}

function sectionToRecord(section: AnnualPlanSection): SectionRecord {
  return {
    id: section.id,
    code: section.sectionCode,
    status: section.status,
    source: section.sourceNote ?? 'Contesto della sezione registrato nel piano annuale',
  }
}

function progressKey(sectionId: string, generationId: string, blockId: string) {
  return `${sectionId}|${generationId}|${blockId}`
}

function emptyProgress(): ProgressEntry {
  return { status: 'PIANIFICATO', date: '', note: '' }
}

function normalizeSectionCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 4)
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'salvataggio non riuscito'
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="annualMetric"><strong>{value}</strong><span>{label}</span></div>
}

function StatusBadge({ status }: { status: AnnualPlanSectionStatus }) {
  const label = status === 'CONFERMATA' ? 'Confermata' : status === 'PROVVISORIA' ? 'Provvisoria' : 'Da confermare'
  const className = status === 'CONFERMATA' ? 'annualBadge confirmed' : status === 'PROVVISORIA' ? 'annualBadge provisional' : 'annualBadge pending'
  return <span className={className}>{label}</span>
}

function blockStatusLabel(status: AnnualPlanBlockStatus) {
  if (status === 'PIANIFICATO') return 'Pianificato'
  if (status === 'SVOLTO') return 'Svolto'
  if (status === 'RECUPERATO') return 'Recuperato'
  if (status === 'RIMODULATO') return 'Rimodulato'
  return 'Annullato'
}
