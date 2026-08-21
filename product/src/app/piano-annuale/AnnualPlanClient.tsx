'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  buildBlocks,
  CANONICAL_PLAN_SOURCES,
  DEFAULT_SECTION_SETS,
  type GradeKey,
} from './model'

type SectionStatus = 'PROVVISORIA' | 'DA_CONFERMARE' | 'CONFERMATA'
type BlockStatus = 'PIANIFICATO' | 'SVOLTO' | 'RECUPERATO' | 'RIMODULATO' | 'ANNULLATO'
type SectionRecord = { code: string; status: SectionStatus; source: string }
type ProgressEntry = { status: BlockStatus; date: string; note: string }
type StoredState = {
  sections: Record<GradeKey, SectionRecord[]>
  progress: Record<string, ProgressEntry>
}

const STORAGE_KEY = 'DOCENTE_OS_CAN_PLAN_2026_27'
const BLOCK_STATUSES: BlockStatus[] = ['PIANIFICATO', 'SVOLTO', 'RECUPERATO', 'RIMODULATO', 'ANNULLATO']
const COMPLETE_STATUSES = new Set<BlockStatus>(['SVOLTO', 'RECUPERATO', 'RIMODULATO'])
const GRADES: GradeKey[] = ['Prima', 'Seconda', 'Terza']

function cloneDefaults(): StoredState {
  return {
    sections: {
      Prima: DEFAULT_SECTION_SETS.Prima.map((item) => ({ ...item })),
      Seconda: DEFAULT_SECTION_SETS.Seconda.map((item) => ({ ...item })),
      Terza: DEFAULT_SECTION_SETS.Terza.map((item) => ({ ...item })),
    },
    progress: {},
  }
}

export default function AnnualPlanClient() {
  const [state, setState] = useState<StoredState>(() => cloneDefaults())
  const [hydrated, setHydrated] = useState(false)
  const [grade, setGrade] = useState<GradeKey>('Prima')
  const [section, setSection] = useState('')
  const [newSection, setNewSection] = useState('')

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredState>
        const defaults = cloneDefaults()
        setState({
          sections: {
            Prima: parsed.sections?.Prima ?? defaults.sections.Prima,
            Seconda: parsed.sections?.Seconda ?? defaults.sections.Seconda,
            Terza: parsed.sections?.Terza ?? defaults.sections.Terza,
          },
          progress: parsed.progress ?? {},
        })
      }
    } catch {
      setState(cloneDefaults())
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [hydrated, state])

  useEffect(() => {
    const available = state.sections[grade]
    if (section && !available.some((item) => item.code === section)) setSection('')
  }, [grade, section, state.sections])

  const blocks = useMemo(() => buildBlocks(grade), [grade])
  const source = CANONICAL_PLAN_SOURCES[grade]
  const selectedSection = state.sections[grade].find((item) => item.code === section) ?? null

  const progressFor = (blockId: string): ProgressEntry => {
    if (!section) return { status: 'PIANIFICATO', date: '', note: '' }
    return state.progress[`${grade}|${section}|${blockId}`] ?? { status: 'PIANIFICATO', date: '', note: '' }
  }

  const completed = section ? blocks.filter((block) => COMPLETE_STATUSES.has(progressFor(block.id).status)) : []
  const nextBlock = blocks.find((block) => {
    const status = progressFor(block.id).status
    return !COMPLETE_STATUSES.has(status) && status !== 'ANNULLATO'
  })

  function updateProgress(blockId: string, patch: Partial<ProgressEntry>) {
    if (!section) return
    const key = `${grade}|${section}|${blockId}`
    setState((current) => ({
      ...current,
      progress: {
        ...current.progress,
        [key]: { ...(current.progress[key] ?? { status: 'PIANIFICATO', date: '', note: '' }), ...patch },
      },
    }))
  }

  function markNextDone() {
    if (!section || !nextBlock) return
    const current = progressFor(nextBlock.id)
    updateProgress(nextBlock.id, {
      status: 'SVOLTO',
      date: current.date || new Date().toISOString().slice(0, 10),
    })
  }

  function addSection() {
    const code = newSection.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 4)
    if (!code || state.sections[grade].some((item) => item.code === code)) return
    setState((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [grade]: [...current.sections[grade], { code, status: 'DA_CONFERMARE', source: 'Sezione inserita nel planner; assegnazione da validare' }],
      },
    }))
    setSection(code)
    setNewSection('')
  }

  function confirmSection() {
    if (!section) return
    setState((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [grade]: current.sections[grade].map((item) =>
          item.code === section ? { ...item, status: 'CONFERMATA', source: 'Assegnazione confermata nel planner' } : item,
        ),
      },
    }))
  }

  function resetSection() {
    if (!section) return
    const prefix = `${grade}|${section}|`
    setState((current) => ({
      ...current,
      progress: Object.fromEntries(Object.entries(current.progress).filter(([key]) => !key.startsWith(prefix))),
    }))
  }

  return (
    <>
      <section className="annualHero">
        <div>
          <p className="contextLine">Tecnologia · piano didattico annuale esecutivo</p>
          <h1>Piano annuale</h1>
          <p>33 blocchi da 2 ore per classe, collegati a UDA, pacchetti e fonti canoniche della KB.</p>
        </div>
        <Link className="secondaryButton" href={`/knowledge/${source.assetId}`}>Apri {source.code} in KB</Link>
      </section>

      <section className="annualContextPanel">
        <div className="annualSelectors">
          <label>
            <span>Classe</span>
            <select value={grade} onChange={(event) => { setGrade(event.target.value as GradeKey); setSection('') }}>
              {GRADES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Sezione</span>
            <select value={section} onChange={(event) => setSection(event.target.value)}>
              <option value="">Vista canonica</option>
              {state.sections[grade].map((item) => <option key={item.code} value={item.code}>{grade} {item.code}</option>)}
            </select>
          </label>
        </div>
        <div className="annualSectionState">
          {selectedSection ? (
            <>
              <StatusBadge status={selectedSection.status} />
              <span>{selectedSection.source}</span>
              {selectedSection.status !== 'CONFERMATA' ? <button className="inlineAction" type="button" onClick={confirmSection}>Conferma assegnazione</button> : null}
            </>
          ) : (
            <span>{grade === 'Prima' ? 'Le nuove sezioni di prima non sono ancora note: nessuna sezione viene inventata.' : 'Vista del canone generale, senza avanzamento di una sezione specifica.'}</span>
          )}
        </div>
        <div className="annualAddSection">
          <input value={newSection} onChange={(event) => setNewSection(event.target.value)} placeholder="Nuova sezione, es. A" aria-label="Nuova sezione" />
          <button className="secondaryButton" type="button" onClick={addSection} disabled={!newSection.trim()}>Aggiungi sezione</button>
        </div>
      </section>

      <section className="annualMetrics" aria-label="Avanzamento annuale">
        <Metric value={`${completed.length}/33`} label="blocchi chiusi" />
        <Metric value={`${completed.length * 2}/66`} label="ore registrate" />
        <Metric value={nextBlock?.id ?? 'CHIUSO'} label="prossimo blocco" />
        <div className="annualSourceMetric">
          <span>Fonte corrente</span>
          <strong>{source.code}</strong>
          <small>generazione #{source.generationId.slice(0, 8)}</small>
        </div>
      </section>

      <section className="annualActions">
        <button className="primaryButton" type="button" onClick={markNextDone} disabled={!section || !nextBlock}>Segna svolto il prossimo blocco</button>
        <button className="secondaryButton" type="button" onClick={resetSection} disabled={!section}>Azzera avanzamento sezione</button>
        <span className="annualSaveState">{hydrated ? 'Avanzamento salvato nel browser' : 'Caricamento avanzamento…'}</span>
      </section>

      <section className="annualTableCard">
        <div className="annualTableHeader">
          <div><h2>Sequenza didattica</h2><p>Il blocco scorre alla prima lezione utile se una lezione salta.</p></div>
          <span>{blocks.length} blocchi · 66 ore</span>
        </div>
        <div className="annualTableWrap">
          <table className="annualTable">
            <thead><tr><th>Blocco</th><th>UDA</th><th>Pacchetto</th><th>Periodo</th><th>Focus</th><th>Stato</th><th>Data</th><th>Evidenza / nota</th></tr></thead>
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
                      {section ? (
                        <select value={progress.status} onChange={(event) => updateProgress(block.id, { status: event.target.value as BlockStatus })} aria-label={`Stato ${block.id}`}>
                          {BLOCK_STATUSES.map((status) => <option key={status}>{status}</option>)}
                        </select>
                      ) : <span className="annualNeutralStatus">PIANIFICATO</span>}
                    </td>
                    <td>{section ? <input type="date" value={progress.date} onChange={(event) => updateProgress(block.id, { date: event.target.value })} aria-label={`Data ${block.id}`} /> : '—'}</td>
                    <td>{section ? <input value={progress.note} onChange={(event) => updateProgress(block.id, { note: event.target.value })} placeholder="Prodotto, verifica, recupero…" aria-label={`Evidenza ${block.id}`} /> : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="annualRulesGrid">
        <article><h2>Regola di scorrimento</h2><p>Una lezione saltata non consuma il blocco. Il blocco resta aperto e passa alla prima lezione utile; Open Day e altre interruzioni non duplicano ore o valutazioni.</p></article>
        <article><h2>Dipendenze aperte</h2><ul><li>nuove sezioni di prima;</li><li>assegnazioni definitive delle sezioni;</li><li>orario settimanale ufficiale;</li><li>data Open Day e interruzioni d’istituto.</li></ul></article>
      </section>
    </>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="annualMetric"><strong>{value}</strong><span>{label}</span></div>
}

function StatusBadge({ status }: { status: SectionStatus }) {
  const label = status === 'DA_CONFERMARE' ? 'DA CONFERMARE' : status
  const className = status === 'CONFERMATA' ? 'annualBadge confirmed' : status === 'PROVVISORIA' ? 'annualBadge provisional' : 'annualBadge pending'
  return <span className={className}>{label}</span>
}
