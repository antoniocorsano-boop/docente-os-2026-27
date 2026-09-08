'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  acceptedLessonDesignResources,
  composeLessonSequence,
  type LessonDesignExtension,
} from '@/core/domain/lesson-design-extension'
import {
  buildLessonWorkspaceHref,
  resolveHumanTaskStepResources,
  type HumanTaskLessonProjection,
  type HumanTaskResource,
} from '@/core/presentation/human-task-content'
import styles from './lesson-live.module.css'

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

export default function LessonLiveClient({
  sectionId,
  sectionLabel,
  block,
  projection,
  extensions,
  progress,
  udaProgress,
}: {
  sectionId: string
  sectionLabel: string
  block: Block
  projection: HumanTaskLessonProjection
  extensions: LessonDesignExtension[]
  progress: Progress
  udaProgress: { completed: number; total: number }
}) {
  const composed = useMemo(() => composeLessonSequence(projection.steps, extensions), [projection.steps, extensions])
  const steps = composed.steps
  const storageKey = `docente-os:lesson-live:${sectionId}:${block.id}`
  const [activeStep, setActiveStep] = useState(0)
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey)
      const parsed = raw ? Number.parseInt(raw, 10) : 0
      if (Number.isFinite(parsed) && steps.length) {
        setActiveStep(Math.max(0, Math.min(parsed, steps.length - 1)))
      }
    } catch {
      // Session persistence is a convenience only; the lesson must remain usable without it.
    } finally {
      setRestored(true)
    }
  }, [storageKey, steps.length])

  useEffect(() => {
    if (!restored) return
    try {
      window.sessionStorage.setItem(storageKey, String(activeStep))
    } catch {
      // Fail open: live guidance does not depend on browser storage.
    }
  }, [activeStep, restored, storageKey])

  const currentStep = steps[activeStep] ?? steps[0]
  const canonicalStep = currentStep?.origin === 'CANONICAL'
    ? projection.steps.find((step) => step.id === currentStep.id) ?? null
    : null
  const resources = canonicalStep ? resolveHumanTaskStepResources(projection, canonicalStep) : []
  const attachedResources = acceptedLessonDesignResources(extensions)
  const isLast = activeStep >= steps.length - 1
  const progressPercent = steps.length ? Math.round(((activeStep + 1) / steps.length) * 100) : 0
  const classHref = `/classi/${encodeURIComponent(sectionId)}`
  const prepareHref = buildLessonWorkspaceHref(sectionId, block.id, 'prepare')
  const observeHref = buildLessonWorkspaceHref(sectionId, block.id, 'observe')
  const recordHref = buildLessonWorkspaceHref(sectionId, block.id, 'record')
  const recorded = progress.status === 'SVOLTO' || progress.status === 'RECUPERATO' || progress.status === 'RIMODULATO'

  if (!currentStep) {
    return (
      <main className={styles.surface}>
        <section className={styles.stepCard}>
          <h2>Questa lezione non ha ancora una sequenza guidata.</h2>
          <p className={styles.instruction}>Torna alla classe: DOCENTE OS non inventa passaggi che non sono presenti nella proiezione approvata.</p>
          <div className={styles.closeActions}><Link className={styles.primary} href={classHref}>Torna alla classe</Link></div>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.surface}>
      <header className={styles.header}>
        <Link className={styles.back} href={classHref}>← {sectionLabel}</Link>
        <p className={styles.eyebrow}>{recorded ? 'LEZIONE REGISTRATA · MODALITÀ GUIDA' : 'IN CLASSE · MODALITÀ LEZIONE'}</p>
        <h1>{projection.title}</h1>
        <div className={styles.meta}>
          <span>{sectionLabel}</span>
          <span>{formatDuration(projection.durationMinutes)}</span>
          <span>{projection.udaTitle}</span>
          <span>{udaProgress.completed}/{udaProgress.total} concluse</span>
        </div>
      </header>

      <section className={styles.progress} aria-label={`Passo ${activeStep + 1} di ${steps.length}`}>
        <div className={styles.progressTop}><span>PASSO {activeStep + 1} DI {steps.length}</span><strong>{progressPercent}%</strong></div>
        <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${progressPercent}%` }} /></div>
      </section>

      <section className={styles.stepCard} aria-live="polite">
        <div className={styles.stepMeta}>
          <strong>{currentStep.origin === 'EXTENSION' ? 'AGGIUNTA DOCENTE' : 'ORA'}</strong>
          <span>{currentStep.minutes === null ? 'Tempo adattabile' : `${currentStep.minutes} min`}</span>
        </div>
        <h2>{currentStep.title}</h2>
        <p className={styles.instruction}>{currentStep.instruction}</p>
        {currentStep.cue ? <p className={styles.cue}>{currentStep.cue}</p> : null}
        {currentStep.origin === 'EXTENSION' && currentStep.sourceLabel ? <p className={styles.cue}>Fonte: {currentStep.sourceLabel}</p> : null}
      </section>

      {resources.map((resource) => <LiveResource resource={resource} key={resource.id} />)}

      {attachedResources.length ? (
        <details className={styles.attached}>
          <summary>Materiali aggiunti dal docente · {attachedResources.length}</summary>
          <div>{attachedResources.map((resource) => <article key={resource.id}><strong>{resource.title}</strong><small>{resource.body}</small></article>)}</div>
        </details>
      ) : null}

      <details className={styles.sequence}>
        <summary>Vedi la sequenza completa</summary>
        <div>
          {steps.map((step, index) => (
            <button className={index === activeStep ? styles.active : ''} type="button" key={step.id} onClick={() => setActiveStep(index)}>
              <span>{index + 1}</span>
              <div><strong>{step.title}</strong><small>{step.minutes === null ? 'Tempo adattabile' : `${step.minutes} min`}</small></div>
            </button>
          ))}
        </div>
      </details>

      <div className={styles.footer} aria-label="Controlli modalità lezione">
        <button type="button" onClick={() => setActiveStep((value) => Math.max(0, value - 1))} disabled={activeStep === 0}>Indietro</button>
        {isLast
          ? <Link className={styles.primary} href={recordHref}>Chiudi la lezione</Link>
          : <button className={styles.primary} type="button" onClick={() => setActiveStep((value) => Math.min(steps.length - 1, value + 1))}>Avanti</button>}
      </div>

      <div className={styles.exitRow}>
        <Link href={observeHref}>Vedi le evidenze</Link>
        <Link href={prepareHref}>Preparazione</Link>
        <Link href={classHref}>Esci dalla modalità lezione</Link>
      </div>
    </main>
  )
}

function LiveResource({ resource }: { resource: HumanTaskResource }) {
  return (
    <section className={styles.resource}>
      <span>{resourceKindLabel(resource.kind)}</span>
      <h3>{resource.title}</h3>
      <p>{resource.instruction}</p>
      {resource.prompts.length ? <ul>{resource.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ul> : null}
    </section>
  )
}

function resourceKindLabel(kind: HumanTaskResource['kind']) {
  if (kind === 'EXIT_TICKET') return 'CHIUSURA'
  if (kind === 'TASK_BRIEF') return 'CONSEGNA'
  if (kind === 'RUBRIC') return 'CRITERI'
  if (kind === 'ASSESSMENT_GUIDE') return 'VERIFICA'
  return 'MATERIALE'
}

function formatDuration(minutes: number) {
  if (minutes === 120) return '2 ore'
  if (minutes % 60 === 0) return `${minutes / 60} ore`
  return `${minutes} min`
}
