'use client'

import { useMemo, useState } from 'react'
import type { ClassroomSessionView } from './classroom-session-model'
import { classroomSupportText } from './classroom-session-model'

type SupportKind = 'SIMPLER' | 'EXAMPLE' | 'CHECK' | 'VISUAL'

export function ClassroomSessionClient({ view }: { view: ClassroomSessionView }) {
  const [activeStep, setActiveStep] = useState(0)
  const [supportKind, setSupportKind] = useState<SupportKind | null>(null)
  const current = view.steps[activeStep] ?? view.steps[0] ?? null
  const support = useMemo(
    () => supportKind ? classroomSupportText(view, activeStep, supportKind) : null,
    [view, activeStep, supportKind],
  )

  function move(delta: number) {
    setSupportKind(null)
    setActiveStep((value) => Math.max(0, Math.min(view.steps.length - 1, value + delta)))
  }

  return (
    <>
      <section className="classroomHero" aria-labelledby="classroom-title">
        <div>
          <p>IN CLASSE · {view.classLabel}</p>
          <h1 id="classroom-title">{view.title}</h1>
          <span>{view.targetDate ? formatDate(view.targetDate) : 'Data non specificata'} · {view.approvalLabel}</span>
          {view.canonicalBindingLabel ? <small>{view.canonicalBindingLabel}</small> : null}
        </div>
        <a className="classroomPresentationButton" href={view.sourceHref} target="_blank" rel="noreferrer">
          Apri presentazione {view.providerLabel} ↗
        </a>
      </section>

      <section className="classroomReadiness" aria-label="Stato della sessione">
        <div><span>Presentazione</span><strong>Pronta</strong></div>
        <div><span>Sequenza</span><strong>{view.steps.length ? `${view.steps.length} passaggi` : 'Non disponibile'}</strong></div>
        <div><span>Assistente</span><strong>Supporto locale attivo</strong></div>
        <div><span>Generazione immagini</span><strong>{view.imageGenerationAvailable ? 'Disponibile' : 'Da collegare'}</strong></div>
      </section>

      {current ? (
        <main className="classroomGrid">
          <section className="classroomStepCard" aria-labelledby="current-step-title">
            <header>
              <div><span>PASSO {activeStep + 1} DI {view.steps.length}</span><h2 id="current-step-title">{current.title}</h2></div>
              <strong>{String(activeStep + 1).padStart(2, '0')}</strong>
            </header>
            <p>{current.instruction}</p>
            {current.cue ? <aside><strong>Da mettere in evidenza</strong><span>{current.cue}</span></aside> : null}
            <div className="classroomStepActions">
              <button type="button" onClick={() => move(-1)} disabled={activeStep === 0}>Indietro</button>
              <button className="primary" type="button" onClick={() => move(1)} disabled={activeStep === view.steps.length - 1}>Passo successivo</button>
            </div>
          </section>

          <aside className="classroomAssistant" aria-labelledby="assistant-title">
            <header>
              <span>ASSISTENZA RAPIDA</span>
              <h2 id="assistant-title">Se serve, aiutami adesso</h2>
              <p>Il supporto usa soltanto il contesto della lezione. Non registra dati degli alunni e non modifica il Piano annuale.</p>
            </header>
            <div className="classroomAssistantTools">
              <button type="button" className={supportKind === 'SIMPLER' ? 'active' : ''} onClick={() => setSupportKind('SIMPLER')}>Spiega più semplice</button>
              <button type="button" className={supportKind === 'EXAMPLE' ? 'active' : ''} onClick={() => setSupportKind('EXAMPLE')}>Dammi un esempio</button>
              <button type="button" className={supportKind === 'CHECK' ? 'active' : ''} onClick={() => setSupportKind('CHECK')}>Domanda flash</button>
              <button type="button" className={supportKind === 'VISUAL' ? 'active' : ''} onClick={() => setSupportKind('VISUAL')}>Idea visuale</button>
            </div>
            {support ? (
              <div className="classroomAssistantAnswer" role="status">
                <strong>{support.title}</strong>
                <p>{support.text}</p>
                {supportKind === 'VISUAL' && !view.imageGenerationAvailable ? (
                  <small>Questo è un brief visuale verificabile. La generazione dell’immagine non viene simulata: sarà attivata solo quando un provider AI sarà collegato tramite il boundary applicativo di Docente OS.</small>
                ) : null}
              </div>
            ) : (
              <p className="classroomAssistantEmpty">Scegli uno strumento solo quando ti serve durante la spiegazione.</p>
            )}
          </aside>
        </main>
      ) : (
        <main className="classroomEmptySequence">
          <h2>La presentazione è pronta, ma non c’è ancora una sequenza operativa strutturata.</h2>
          <p>Puoi usare la presentazione senza problemi. Docente OS non inventa passaggi che non sono stati predisposti.</p>
        </main>
      )}

      <details className="classroomSequenceDisclosure">
        <summary>Vedi tutta la sequenza</summary>
        <div>
          {view.steps.map((step, index) => (
            <button type="button" onClick={() => { setActiveStep(index); setSupportKind(null) }} key={`${index}-${step.title}`}>
              <span>{index + 1}</span><div><strong>{step.title}</strong><small>{step.instruction}</small></div>
            </button>
          ))}
        </div>
      </details>
    </>
  )
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)))
}
