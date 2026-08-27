'use client'

import { useEffect, useState, useTransition } from 'react'
import type { CurriculumFeedbackCategory, CurriculumFeedbackPreview } from '@/core/domain/cml-curriculum-feedback'
import {
  confirmAndExportCurriculumFeedbackRelay,
  getCurriculumFeedbackRelayContext,
  previewCurriculumFeedbackRelay,
} from './actions'

type RelayContext = Awaited<ReturnType<typeof getCurriculumFeedbackRelayContext>>
type ExportResult = Awaited<ReturnType<typeof confirmAndExportCurriculumFeedbackRelay>>

const CATEGORY_OPTIONS: Array<{ value: CurriculumFeedbackCategory; label: string }> = [
  { value: 'SEQUENCING', label: 'Ordine o sequenza' },
  { value: 'PREREQUISITE', label: 'Prerequisito necessario' },
  { value: 'SCOPE', label: 'Ampiezza del contenuto' },
  { value: 'WORDING', label: 'Formulazione da chiarire' },
  { value: 'FEASIBILITY', label: 'Realizzabilità nel lavoro didattico' },
  { value: 'OTHER', label: 'Altra osservazione' },
]

export default function CurriculumFeedbackRelay({
  sectionId,
  sectionLabel,
}: {
  sectionId: string
  sectionLabel: string
}) {
  const [context, setContext] = useState<RelayContext | null>(null)
  const [category, setCategory] = useState<CurriculumFeedbackCategory>('SEQUENCING')
  const [requirementId, setRequirementId] = useState('')
  const [summary, setSummary] = useState('')
  const [feedbackId, setFeedbackId] = useState('')
  const [preview, setPreview] = useState<CurriculumFeedbackPreview | null>(null)
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false)
  const [exportResult, setExportResult] = useState<ExportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setContext(null)
    setRequirementId('')
    setSummary('')
    setFeedbackId('')
    setPreview(null)
    setPrivacyConfirmed(false)
    setExportResult(null)
    setError(null)
  }, [sectionId])

  function loadContext() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await getCurriculumFeedbackRelayContext(sectionId)
        setContext(result)
        if (result.available && result.nodes.length > 0) setRequirementId(result.nodes[0].requirementId)
      } catch (cause) {
        setError(message(cause))
      }
    })
  }

  function preparePreview() {
    if (!requirementId || summary.trim().length < 10) {
      setError('Scegli il riferimento curricolare e scrivi un’osservazione di almeno 10 caratteri.')
      return
    }
    const id = feedbackId || `feedback-${crypto.randomUUID()}`
    setFeedbackId(id)
    setError(null)
    setPrivacyConfirmed(false)
    setExportResult(null)
    startTransition(async () => {
      try {
        const result = await previewCurriculumFeedbackRelay({
          sectionId,
          feedbackId: id,
          category,
          requirementId,
          summary,
        })
        setPreview(result)
      } catch (cause) {
        setError(message(cause))
      }
    })
  }

  function confirmAndDownload() {
    if (!preview || !feedbackId) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await confirmAndExportCurriculumFeedbackRelay({
          sectionId,
          feedbackId,
          category,
          requirementId,
          summary,
          privacyConfirmed,
        })
        setExportResult(result)
        downloadJson(result.filename, result.envelope)
      } catch (cause) {
        setError(message(cause))
      }
    })
  }

  return (
    <details className="humanTaskSecondary">
      <summary>Condividi un’osservazione sul curricolo</summary>
      <div className="humanTaskSecondaryBody annualManagementPanel">
        <div>
          <h3>Dal lavoro didattico alla revisione curricolare</h3>
          <p>
            Puoi preparare un’osservazione professionale riferita al quadro curricolare che hai già accettato per {sectionLabel}.
            Non vengono inviati dati automaticamente e l’osservazione non diventa una proposta o una decisione istituzionale.
          </p>
        </div>

        {!context ? (
          <button className="secondaryButton" type="button" onClick={loadContext} disabled={isPending}>
            {isPending ? 'Controllo il quadro…' : 'Prepara un’osservazione'}
          </button>
        ) : !context.available ? (
          <div className="annualSaveState syncError">{context.reason}</div>
        ) : (
          <>
            <div className="annualSelectors">
              <label>
                <span>Che cosa hai osservato</span>
                <select value={category} onChange={(event) => { setCategory(event.target.value as CurriculumFeedbackCategory); setPreview(null) }}>
                  {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                <span>Riferimento curricolare</span>
                <select value={requirementId} onChange={(event) => { setRequirementId(event.target.value); setPreview(null) }}>
                  {context.nodes.map((node) => <option key={node.requirementId} value={node.requirementId}>{node.description}</option>)}
                </select>
              </label>
            </div>

            <label>
              <span>Osservazione professionale</span>
              <textarea
                value={summary}
                onChange={(event) => { setSummary(event.target.value); setPreview(null) }}
                rows={4}
                maxLength={2000}
                placeholder="Esempio: questo prerequisito è risultato necessario prima di affrontare il contenuto successivo."
              />
            </label>
            <p>Non inserire nomi, voti, presenze, PDP/PEI, note individuali o altri dati personali degli studenti.</p>

            {!preview ? (
              <button className="secondaryButton" type="button" onClick={preparePreview} disabled={isPending || summary.trim().length < 10 || !requirementId}>
                Controlla cosa condividerai
              </button>
            ) : (
              <div className="humanTaskFocus">
                <p className="humanTaskFocusEyebrow">ANTEPRIMA · NESSUN INVIO</p>
                <h3>{CATEGORY_OPTIONS.find((option) => option.value === preview.category)?.label ?? 'Osservazione curricolare'}</h3>
                <p>{preview.summary}</p>
                <p><strong>Destinazione:</strong> CurManLight Arena, come osservazione professionale da valutare.</p>
                <label>
                  <input
                    type="checkbox"
                    checked={privacyConfirmed}
                    onChange={(event) => setPrivacyConfirmed(event.target.checked)}
                  />{' '}
                  Confermo che il testo non contiene dati personali degli studenti.
                </label>
                <div className="humanTaskActions">
                  <button className="primary" type="button" onClick={confirmAndDownload} disabled={isPending || !privacyConfirmed}>
                    {isPending ? 'Preparo il file…' : 'Conferma e prepara il file'}
                  </button>
                  <button className="secondaryButton" type="button" onClick={() => { setPreview(null); setPrivacyConfirmed(false) }} disabled={isPending}>
                    Modifica
                  </button>
                </div>
                <details>
                  <summary>Dettagli tecnici e provenienza</summary>
                  <p>Contesto {preview.baseline.curricularContextId} · impronta {preview.baseline.sourceHandoffFootprintHash}.</p>
                  <p>Esclusi per contratto: identificativi studenti, voti, presenze, note private ed eventi grezzi di classe.</p>
                </details>
              </div>
            )}

            {exportResult ? (
              <div className="annualSaveState">
                <strong>File preparato.</strong> {exportResult.note} Ricevuta locale {exportResult.receipt.id}.
              </div>
            ) : null}
          </>
        )}

        {error ? <div className="annualSaveState syncError">{error}</div> : null}
      </div>
    </details>
  )
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function message(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Non è stato possibile preparare l’osservazione.'
}
