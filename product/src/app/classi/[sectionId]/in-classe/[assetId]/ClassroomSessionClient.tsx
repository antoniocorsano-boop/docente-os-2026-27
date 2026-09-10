'use client'

import { useMemo, useState } from 'react'
import type { ClassroomSessionView } from './classroom-session-model'
import { classroomSupportText } from './classroom-session-model'

type SupportKind = 'SIMPLER' | 'EXAMPLE' | 'CHECK' | 'VISUAL'
type TextSupportKind = Exclude<SupportKind, 'VISUAL'>

type TextProposal = {
  capability: 'CLASSROOM_TEXT_PROPOSE'
  status: 'PROPOSED'
  text: string
  provider: string
  model: string
}

type ImageProposal = {
  capability: 'CLASSROOM_IMAGE_GENERATE'
  status: 'PROPOSED'
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  base64: string
  altText: string
  provider: string
  model: string
}

type AiProposal =
  | { type: 'TEXT'; value: TextProposal }
  | { type: 'IMAGE'; value: ImageProposal }

export function ClassroomSessionClient({ view }: { view: ClassroomSessionView }) {
  const [activeStep, setActiveStep] = useState(0)
  const [supportKind, setSupportKind] = useState<SupportKind | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiProposal, setAiProposal] = useState<AiProposal | null>(null)
  const current = view.steps[activeStep] ?? view.steps[0] ?? null
  const support = useMemo(
    () => supportKind ? classroomSupportText(view, activeStep, supportKind) : null,
    [view, activeStep, supportKind],
  )

  function resetAi() {
    setAiBusy(false)
    setAiError(null)
    setAiProposal(null)
  }

  function move(delta: number) {
    setSupportKind(null)
    resetAi()
    setActiveStep((value) => Math.max(0, Math.min(view.steps.length - 1, value + delta)))
  }

  function chooseSupport(kind: SupportKind) {
    resetAi()
    setSupportKind(kind)
  }

  async function requestTextProposal(kind: TextSupportKind) {
    setAiBusy(true)
    setAiError(null)
    setAiProposal(null)
    try {
      const result = await requestAi<TextProposal>({
        mode: 'TEXT',
        sectionId: view.sectionId,
        assetId: view.assetId,
        stepIndex: activeStep,
        supportKind: kind,
      })
      setAiProposal({ type: 'TEXT', value: result })
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Il supporto generativo non è disponibile.')
    } finally {
      setAiBusy(false)
    }
  }

  async function requestImageProposal() {
    setAiBusy(true)
    setAiError(null)
    setAiProposal(null)
    try {
      const result = await requestAi<ImageProposal>({
        mode: 'IMAGE',
        sectionId: view.sectionId,
        assetId: view.assetId,
        stepIndex: activeStep,
      })
      setAiProposal({ type: 'IMAGE', value: result })
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'La generazione del visuale non è disponibile.')
    } finally {
      setAiBusy(false)
    }
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
        <div><span>Assistente</span><strong>{view.textGenerationAvailable ? 'Locale + AI disponibile' : 'Supporto locale attivo'}</strong></div>
        <div><span>Generazione immagini</span><strong>{view.imageGenerationAvailable ? 'Disponibile su richiesta' : 'Non configurata'}</strong></div>
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
              <button type="button" className={supportKind === 'SIMPLER' ? 'active' : ''} onClick={() => chooseSupport('SIMPLER')}>Spiega più semplice</button>
              <button type="button" className={supportKind === 'EXAMPLE' ? 'active' : ''} onClick={() => chooseSupport('EXAMPLE')}>Dammi un esempio</button>
              <button type="button" className={supportKind === 'CHECK' ? 'active' : ''} onClick={() => chooseSupport('CHECK')}>Domanda flash</button>
              <button type="button" className={supportKind === 'VISUAL' ? 'active' : ''} onClick={() => chooseSupport('VISUAL')}>Idea visuale</button>
            </div>
            {support ? (
              <div className="classroomAssistantAnswer" role="status">
                <strong>{support.title}</strong>
                <p>{support.text}</p>
                {supportKind === 'VISUAL' ? (
                  view.imageGenerationAvailable ? (
                    <button className="classroomGenerateButton" type="button" onClick={requestImageProposal} disabled={aiBusy}>
                      {aiBusy ? 'Preparo l’anteprima…' : 'Genera visuale da questo brief'}
                    </button>
                  ) : (
                    <small>Questo brief resta utilizzabile anche senza AI. La generazione sarà disponibile quando il provider sarà configurato sul server.</small>
                  )
                ) : view.textGenerationAvailable && supportKind ? (
                  <button className="classroomGenerateButton" type="button" onClick={() => requestTextProposal(supportKind)} disabled={aiBusy}>
                    {aiBusy ? 'Preparo la proposta…' : 'Proponi una variante AI'}
                  </button>
                ) : (
                  <small>Il supporto locale è già pronto e resta disponibile anche senza provider AI.</small>
                )}
              </div>
            ) : (
              <p className="classroomAssistantEmpty">Scegli uno strumento solo quando ti serve durante la spiegazione.</p>
            )}

            {aiError ? <div className="classroomAiError" role="alert"><strong>AI non disponibile</strong><span>{aiError}</span><small>Puoi continuare immediatamente con il supporto locale qui sopra.</small></div> : null}

            {aiProposal?.type === 'TEXT' ? (
              <div className="classroomAiProposal" aria-label="Proposta AI testuale">
                <span>PROPOSTA AI · DA VALUTARE</span>
                <p>{aiProposal.value.text}</p>
                <small>{aiProposal.value.provider} · {aiProposal.value.model} · non applicata e non salvata</small>
                <button type="button" onClick={() => setAiProposal(null)}>Scarta proposta</button>
              </div>
            ) : null}

            {aiProposal?.type === 'IMAGE' ? (
              <div className="classroomAiProposal classroomImageProposal" aria-label="Anteprima AI visuale">
                <span>ANTEPRIMA AI · DA VALUTARE</span>
                <img src={`data:${aiProposal.value.mimeType};base64,${aiProposal.value.base64}`} alt={aiProposal.value.altText} />
                <small>{aiProposal.value.provider} · {aiProposal.value.model} · anteprima effimera, non salvata nel Piano o in Drive</small>
                <div>
                  <a href={`data:${aiProposal.value.mimeType};base64,${aiProposal.value.base64}`} target="_blank" rel="noreferrer">Apri visuale ↗</a>
                  <button type="button" onClick={() => setAiProposal(null)}>Scarta anteprima</button>
                </div>
              </div>
            ) : null}
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
            <button type="button" onClick={() => { setActiveStep(index); setSupportKind(null); resetAi() }} key={`${index}-${step.title}`}>
              <span>{index + 1}</span><div><strong>{step.title}</strong><small>{step.instruction}</small></div>
            </button>
          ))}
        </div>
      </details>
    </>
  )
}

async function requestAi<T>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/classroom-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await response.json().catch(() => ({})) as { message?: string } & T
  if (!response.ok) throw new Error(body.message || 'Il provider generativo non ha completato la richiesta.')
  return body
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)))
}
