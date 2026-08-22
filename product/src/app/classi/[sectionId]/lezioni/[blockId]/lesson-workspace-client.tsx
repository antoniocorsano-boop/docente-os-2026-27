'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import { recordLessonExecution } from '../actions'

export type LessonWorkspaceMode = 'prepare' | 'teach' | 'observe' | 'record'

type Block = {
  id: string
  uda: string
  pack: string
  period: string
  focus: string
  hours: number
}

type Progress = {
  status: string
  executedOn: string | null
  evidenceNote: string | null
}

const MODE_LABELS: Array<{ key: LessonWorkspaceMode; label: string }> = [
  { key: 'prepare', label: 'Prepara' },
  { key: 'teach', label: 'In classe' },
  { key: 'observe', label: 'Osserva' },
  { key: 'record', label: 'Registra' },
]

export default function LessonWorkspaceClient({
  sectionId,
  sectionLabel,
  block,
  projection,
  initialMode,
  progress,
  udaProgress,
}: {
  sectionId: string
  sectionLabel: string
  block: Block
  projection: HumanTaskLessonProjection
  initialMode: LessonWorkspaceMode
  progress: Progress
  udaProgress: { completed: number; total: number }
}) {
  const [mode, setMode] = useState<LessonWorkspaceMode>(initialMode)
  const [activeStep, setActiveStep] = useState(0)
  const [prepared, setPrepared] = useState<Record<number, boolean>>({})
  const [observed, setObserved] = useState<Record<number, boolean>>({})
  const currentStep = projection.steps[activeStep]
  const classHref = `/classi/${encodeURIComponent(sectionId)}`
  const recorded = progress.status === 'SVOLTO' || progress.status === 'RECUPERATO' || progress.status === 'RIMODULATO'
  const preparedCount = Object.values(prepared).filter(Boolean).length
  const observedCount = Object.values(observed).filter(Boolean).length
  const studentSheet = projection.resources.find((resource) => resource.kind === 'STUDENT_SHEET') ?? null
  const exitTicket = projection.resources.find((resource) => resource.kind === 'EXIT_TICKET') ?? null
  const modeIndex = useMemo(() => MODE_LABELS.findIndex((item) => item.key === mode), [mode])

  function advanceStep() {
    if (activeStep < projection.steps.length - 1) {
      setActiveStep((value) => value + 1)
      return
    }
    setMode('observe')
  }

  return (
    <>
      <header className="lessonWorkspaceHeader">
        <Link className="lessonBack" href={classHref}>← {sectionLabel}</Link>
        <div className="lessonContextPath"><span>{sectionLabel}</span><i aria-hidden>›</i><span>UDA {projection.udaCode}</span><i aria-hidden>›</i><strong>{block.id}</strong></div>
        <p className="lessonEyebrow">LEZIONE · {recorded ? 'REGISTRATA' : 'DA SVOLGERE'}</p>
        <h1>{projection.title}</h1>
        <p className="lessonWhy">{projection.why}</p>
        <div className="lessonMeta">
          <span>2 ore</span>
          <span>{projection.period}</span>
          <span>UDA {udaProgress.completed}/{udaProgress.total} lezioni concluse</span>
          <span>{projection.packCode}</span>
        </div>
        {recorded ? <div className="lessonRecordedState">Registrata {progress.executedOn ? `il ${formatDate(progress.executedOn)}` : ''} · {progressStatusLabel(progress.status)}</div> : null}
      </header>

      <nav className="lessonModeRail" aria-label="Fasi di lavoro della lezione">
        {MODE_LABELS.map((item, index) => (
          <button
            type="button"
            key={item.key}
            className={item.key === mode ? 'active' : index < modeIndex ? 'passed' : ''}
            onClick={() => setMode(item.key)}
          >
            <span>{index + 1}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>

      {mode === 'prepare' ? (
        <main className="lessonTaskPane" aria-labelledby="prepare-title">
          <section className="lessonTaskLead">
            <p>PRIMA DI ENTRARE</p>
            <h2 id="prepare-title">Prepara solo ciò che serve</h2>
            <span>Obiettivo: {projection.objective}</span>
          </section>

          <section className="lessonChecklist" aria-label="Materiali da predisporre">
            <div className="lessonSectionHeading"><div><span>MATERIALI</span><h3>Cosa predisporre</h3></div><small>{preparedCount}/{projection.preparation.length} controllati</small></div>
            {projection.preparation.map((item, index) => (
              <label key={item}>
                <input type="checkbox" checked={Boolean(prepared[index])} onChange={(event) => setPrepared((current) => ({ ...current, [index]: event.target.checked }))} />
                <span>{item}</span>
              </label>
            ))}
          </section>

          {studentSheet ? (
            <section className="lessonResourceCard">
              <div><span>MATERIALE ALUNNI</span><h3>{studentSheet.title}</h3><p>{studentSheet.instruction}</p></div>
              <details><summary>Vedi la scheda</summary><ol>{studentSheet.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ol></details>
            </section>
          ) : null}

          <details className="lessonDisclosure">
            <summary>Cosa devono imparare in questa lezione</summary>
            <div><ul>{projection.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul></div>
          </details>

          <div className="lessonPrimaryActions">
            <button className="primary" type="button" onClick={() => { setActiveStep(0); setMode('teach') }}>Inizia la lezione</button>
            <Link href={classHref}>Torna alla classe</Link>
          </div>
        </main>
      ) : null}

      {mode === 'teach' ? (
        <main className="lessonTaskPane" aria-labelledby="teach-title">
          <section className="lessonTaskLead compact">
            <p>IN CLASSE · PASSO {activeStep + 1} DI {projection.steps.length}</p>
            <h2 id="teach-title">{currentStep.title}</h2>
            <span>{currentStep.minutes} min · {currentStep.instruction}</span>
          </section>

          <section className="lessonCurrentStep">
            <div className="lessonStepNumber">{String(activeStep + 1).padStart(2, '0')}</div>
            <div><strong>{currentStep.title}</strong><p>{currentStep.instruction}</p>{currentStep.cue ? <small>{currentStep.cue}</small> : null}</div>
          </section>

          {currentStep.id === 'S04' && studentSheet ? <InlineResource resource={studentSheet} /> : null}
          {currentStep.id === 'S08' && exitTicket ? <InlineResource resource={exitTicket} /> : null}

          <div className="lessonStepActions">
            <button type="button" onClick={() => setActiveStep((value) => Math.max(0, value - 1))} disabled={activeStep === 0}>Indietro</button>
            <button className="primary" type="button" onClick={advanceStep}>{activeStep === projection.steps.length - 1 ? 'Passa all’osservazione' : 'Passo successivo'}</button>
          </div>

          <details className="lessonDisclosure">
            <summary>Vedi tutta la sequenza</summary>
            <div className="lessonSequenceList">{projection.steps.map((step, index) => <button type="button" key={step.id} onClick={() => setActiveStep(index)}><span>{index + 1}</span><div><strong>{step.title}</strong><small>{step.minutes} min</small></div></button>)}</div>
          </details>
        </main>
      ) : null}

      {mode === 'observe' ? (
        <main className="lessonTaskPane" aria-labelledby="observe-title">
          <section className="lessonTaskLead">
            <p>PRIMA DI CHIUDERE</p>
            <h2 id="observe-title">Guarda poche evidenze utili</h2>
            <span>{projection.evidence}</span>
          </section>

          <section className="lessonChecklist observation" aria-label="Indicatori di osservazione">
            <div className="lessonSectionHeading"><div><span>OSSERVAZIONE</span><h3>Cosa guardare</h3></div><small>{observedCount}/{projection.observation.length} richiamati</small></div>
            <p className="lessonPrivacyNote">Promemoria per il docente: questi check restano nella schermata e non registrano dati individuali degli alunni.</p>
            {projection.observation.map((item, index) => (
              <label key={item}>
                <input type="checkbox" checked={Boolean(observed[index])} onChange={(event) => setObserved((current) => ({ ...current, [index]: event.target.checked }))} />
                <span>{item}</span>
              </label>
            ))}
          </section>

          <aside className="lessonAssessmentNote"><strong>Valutazione</strong><p>{projection.assessmentNote}</p></aside>

          <div className="lessonPrimaryActions">
            <button className="primary" type="button" onClick={() => setMode('record')}>Registra la lezione</button>
            <button type="button" onClick={() => setMode('teach')}>Torna alla sequenza</button>
          </div>
        </main>
      ) : null}

      {mode === 'record' ? (
        <main className="lessonTaskPane" aria-labelledby="record-title">
          <section className="lessonTaskLead">
            <p>CHIUSURA · {sectionLabel}</p>
            <h2 id="record-title">Registra soltanto ciò che è successo</h2>
            <span>Dopo il salvataggio torni alla classe e DOCENTE OS mostrerà il prossimo blocco reale del piano.</span>
          </section>

          <form action={recordLessonExecution} className="lessonRecordForm">
            <input type="hidden" name="sectionId" value={sectionId} />
            <input type="hidden" name="blockId" value={block.id} />
            <label><span>Com’è andata?</span><select name="status" defaultValue={recordableDefault(progress.status)}><option value="SVOLTO">Svolta come prevista</option><option value="RIMODULATO">Rimodulata</option><option value="RECUPERATO">Lezione di recupero</option></select></label>
            <label><span>Evidenza o nota <small>facoltativa</small></span><textarea name="evidenceNote" rows={4} maxLength={2000} defaultValue={progress.evidenceNote ?? ''} placeholder="Per esempio: scheda completata; tempi ridotti; da riprendere il lessico…" /></label>
            <div className="lessonRecordEvidence"><span>Evidenza prevista</span><strong>{projection.evidence}</strong><small>È un promemoria: viene registrato solo ciò che scrivi tu.</small></div>
            <button className="primary" type="submit">Salva e continua</button>
          </form>

          <button className="lessonTextAction" type="button" onClick={() => setMode('observe')}>Torna all’osservazione senza salvare</button>
        </main>
      ) : null}

      <details className="lessonSources">
        <summary>Fonti canoniche e documenti completi</summary>
        <div><p>Questa vista non sostituisce i documenti: ne espone solo le parti necessarie al compito corrente.</p>{projection.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}><span>{source.code}</span><strong>{source.label}</strong><small>Apri documento completo ↗</small></a>)}</div>
      </details>
    </>
  )
}

function InlineResource({ resource }: { resource: HumanTaskLessonProjection['resources'][number] }) {
  return <section className="lessonInlineResource"><span>{resource.kind === 'EXIT_TICKET' ? 'CHIUSURA' : 'MATERIALE ALUNNI'}</span><h3>{resource.title}</h3><p>{resource.instruction}</p><ul>{resource.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ul></section>
}

function recordableDefault(status: string) {
  if (status === 'RECUPERATO' || status === 'RIMODULATO' || status === 'SVOLTO') return status
  return 'SVOLTO'
}

function progressStatusLabel(status: string) {
  if (status === 'RECUPERATO') return 'Recuperata'
  if (status === 'RIMODULATO') return 'Rimodulata'
  return 'Svolta'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}
