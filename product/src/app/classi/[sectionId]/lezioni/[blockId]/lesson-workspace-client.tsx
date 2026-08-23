'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  resolveHumanTaskLessonTiming,
  resolveHumanTaskResourcesForSurface,
  resolveHumanTaskStepResources,
  type HumanTaskLessonProjection,
  type HumanTaskLessonTiming,
  type HumanTaskResource,
  type HumanTaskResourceKind,
  type HumanTaskSourceAlignment,
} from '@/core/presentation/human-task-content'
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
  const preparationResources = useMemo(
    () => resolveHumanTaskResourcesForSurface(projection, 'PREPARE'),
    [projection],
  )
  const observationResources = useMemo(
    () => resolveHumanTaskResourcesForSurface(projection, 'OBSERVE'),
    [projection],
  )
  const currentStepResources = useMemo(
    () => resolveHumanTaskStepResources(projection, currentStep),
    [projection, currentStep],
  )
  const modeIndex = useMemo(() => MODE_LABELS.findIndex((item) => item.key === mode), [mode])
  const timing = useMemo(() => resolveHumanTaskLessonTiming(projection), [projection])

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
        <div className="lessonContextPath"><span>{sectionLabel}</span><i aria-hidden>›</i><span>{projection.udaTitle}</span><i aria-hidden>›</i><strong>{projection.title}</strong></div>
        <p className="lessonEyebrow">LEZIONE · {recorded ? 'REGISTRATA' : 'DA SVOLGERE'}</p>
        <h1>{projection.title}</h1>
        <p className="lessonWhy">{projection.why}</p>
        <div className="lessonMeta">
          <span>{formatDuration(projection.durationMinutes)}</span>
          <span>{projection.period}</span>
          <span>{udaProgress.completed}/{udaProgress.total} lezioni del percorso concluse</span>
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

      <ContextSupport mode={mode} timing={timing} recorded={recorded} alignment={projection.sourceAlignment} />

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

          {preparationResources.map((resource) => <ResourceCard resource={resource} key={resource.id} />)}

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
            <span>{stepLead(currentStep.minutes, currentStep.instruction)}</span>
          </section>

          <section className="lessonCurrentStep">
            <div className="lessonStepNumber">{String(activeStep + 1).padStart(2, '0')}</div>
            <div><strong>{currentStep.title}</strong><p>{currentStep.instruction}</p>{currentStep.cue ? <small>{currentStep.cue}</small> : null}</div>
          </section>

          {currentStepResources.map((resource) => <InlineResource resource={resource} key={resource.id} />)}

          <div className="lessonStepActions">
            <button type="button" onClick={() => setActiveStep((value) => Math.max(0, value - 1))} disabled={activeStep === 0}>Indietro</button>
            <button className="primary" type="button" onClick={advanceStep}>{activeStep === projection.steps.length - 1 ? 'Passa all’osservazione' : 'Passo successivo'}</button>
          </div>

          <details className="lessonDisclosure">
            <summary>Vedi tutta la sequenza</summary>
            <div className="lessonSequenceList">{projection.steps.map((step, index) => <button type="button" key={step.id} onClick={() => setActiveStep(index)}><span>{index + 1}</span><div><strong>{step.title}</strong>{step.minutes !== null ? <small>{step.minutes} min</small> : null}</div></button>)}</div>
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
            <p className="lessonPrivacyNote">Questi check sono un promemoria locale e non registrano dati individuali degli alunni.</p>
            {projection.observation.map((item, index) => (
              <label key={item}>
                <input type="checkbox" checked={Boolean(observed[index])} onChange={(event) => setObserved((current) => ({ ...current, [index]: event.target.checked }))} />
                <span>{item}</span>
              </label>
            ))}
          </section>

          <aside className="lessonAssessmentNote"><strong>Valutazione</strong><p>{projection.assessmentNote}</p></aside>

          {observationResources.map((resource) => <ResourceCard resource={resource} key={resource.id} />)}

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
            <span>Dopo il salvataggio torni alla classe e DOCENTE OS mostra la prossima lezione prevista dal piano.</span>
          </section>

          <form action={recordLessonExecution} className="lessonRecordForm">
            <input type="hidden" name="sectionId" value={sectionId} />
            <input type="hidden" name="blockId" value={block.id} />
            <label><span>Com’è andata?</span><select name="status" defaultValue={recordableDefault(progress.status)}><option value="SVOLTO">Svolta come prevista</option><option value="RIMODULATO">Rimodulata</option><option value="RECUPERATO">Lezione di recupero</option></select></label>
            <label><span>Evidenza o nota <small>facoltativa</small></span><textarea name="evidenceNote" rows={4} maxLength={2000} defaultValue={progress.evidenceNote ?? ''} placeholder="Per esempio: scheda completata; attività rimodulata; concetto da riprendere…" /></label>
            <div className="lessonRecordEvidence"><span>Evidenza prevista</span><strong>{projection.evidence}</strong><small>È un promemoria: viene registrato solo ciò che scrivi tu.</small></div>
            <button className="primary" type="submit">{recorded ? 'Aggiorna e torna alla classe' : 'Salva e continua'}</button>
          </form>

          <button className="lessonTextAction" type="button" onClick={() => setMode('observe')}>Torna all’osservazione senza salvare</button>
        </main>
      ) : null}

      <details className="lessonSources">
        <summary>Documenti e fonti</summary>
        <div>
          <p>Qui trovi i documenti completi da cui è stata ricavata questa vista. Servono per approfondire, verificare o documentare il percorso.</p>
          {projection.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}><span>{sourceRoleLabel(source.role)}</span><strong>{source.label}</strong><small>Apri documento ↗</small></a>)}
          <details className="lessonTechnicalRefs"><summary>Riferimenti tecnici</summary><p>{projection.sources.map((source) => source.code).join(' · ')}</p></details>
        </div>
      </details>
    </>
  )
}

function ContextSupport({
  mode,
  timing,
  recorded,
  alignment,
}: {
  mode: LessonWorkspaceMode
  timing: HumanTaskLessonTiming
  recorded: boolean
  alignment: HumanTaskSourceAlignment
}) {
  let content: string
  if (mode === 'prepare') {
    content = 'Le spunte servono solo come promemoria mentre prepari: non vengono salvate e non devi completarle tutte per iniziare.'
  } else if (mode === 'teach') {
    const alignmentHelp = alignment.level === 'COMPOSED' && alignment.note ? ` ${alignment.note}` : ''
    content = `${timingHelp(timing)}${alignmentHelp}`
  } else if (mode === 'observe') {
    content = 'Non devi spuntare tutti gli indicatori. Usali per richiamare l’attenzione su poche evidenze utili; le spunte non vengono salvate.'
  } else {
    content = recorded
      ? 'Stai modificando una registrazione già esistente. Se salvi di nuovo, la data originaria della lezione resta invariata.'
      : 'Registra solo l’esito reale e, se serve, una nota breve. Non è necessario ricopiare ciò che è già descritto nella lezione.'
  }
  return <details className="lessonSupport"><summary>Serve una mano?</summary><p>{content}</p></details>
}

function ResourceCard({ resource }: { resource: HumanTaskResource }) {
  return (
    <section className="lessonResourceCard">
      <div><span>{resourceKindLabel(resource.kind)}</span><h3>{resource.title}</h3><p>{resource.instruction}</p></div>
      <details><summary>{resourceDisclosureLabel(resource.kind)}</summary><ol>{resource.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ol></details>
    </section>
  )
}

function InlineResource({ resource }: { resource: HumanTaskResource }) {
  return <section className="lessonInlineResource"><span>{resourceKindLabel(resource.kind)}</span><h3>{resource.title}</h3><p>{resource.instruction}</p><ul>{resource.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ul></section>
}

function timingHelp(timing: HumanTaskLessonTiming) {
  if (timing.status === 'UNSPECIFIED') {
    return `La fonte indica ${formatDuration(timing.durationMinutes)} complessive ma non assegna minuti alle singole attività. Segui l’ordine e adatta i tempi alla risposta reale della classe.`
  }
  if (timing.status === 'MIXED') {
    return `La fonte assegna un tempo solo ad alcune attività (${timing.knownMinutes} minuti descritti). Non vengono dedotte durate per i passaggi senza tempo.`
  }
  if (timing.status === 'PARTIAL') {
    return `La fonte scandisce ${timing.knownMinutes} dei ${timing.durationMinutes} minuti: ${timing.unallocatedMinutes} minuti restano non assegnati. I tempi sono una guida, non un timer.`
  }
  return 'La fonte temporizza l’intera sequenza. I tempi restano una guida e possono essere adattati alla risposta reale della classe.'
}

function stepLead(minutes: number | null, instruction: string) {
  return minutes === null ? instruction : `${minutes} min · ${instruction}`
}

function resourceKindLabel(kind: HumanTaskResourceKind) {
  if (kind === 'EXIT_TICKET') return 'CHIUSURA'
  if (kind === 'TASK_BRIEF') return 'CONSEGNA'
  if (kind === 'RUBRIC') return 'CRITERI'
  if (kind === 'ASSESSMENT_GUIDE') return 'VERIFICA'
  return 'MATERIALE ALUNNI'
}

function resourceDisclosureLabel(kind: HumanTaskResourceKind) {
  if (kind === 'TASK_BRIEF') return 'Vedi la consegna'
  if (kind === 'RUBRIC') return 'Vedi i criteri'
  if (kind === 'ASSESSMENT_GUIDE') return 'Vedi la struttura'
  if (kind === 'EXIT_TICKET') return 'Vedi la chiusura'
  return 'Vedi la scheda'
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

function sourceRoleLabel(role: HumanTaskLessonProjection['sources'][number]['role']) {
  if (role === 'PLAN') return 'Piano annuale'
  if (role === 'UDA') return 'Percorso didattico'
  return 'Materiali operativi'
}

function formatDuration(minutes: number) {
  if (minutes === 120) return '2 ore'
  if (minutes % 60 === 0) return `${minutes / 60} ore`
  return `${minutes} min`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}
