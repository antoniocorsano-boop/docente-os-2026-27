'use client'

import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import './knowledge-upload-comfort.css'
import { finalizeKnowledgeFileUpload } from './upload-actions'
import {
  isAllowedKnowledgeUploadMime,
  MAX_KNOWLEDGE_UPLOAD_BYTES,
  normalizeKnowledgeUploadMime,
} from './upload-policy'
import { inspectFilenameForPilot, inspectFreeTextForPilot, pilotPrivacyErrorMessage } from '@/core/privacy/anonymization-guard'

type UploadPhase = 'IDLE' | 'READY' | 'UPLOADING' | 'ORGANIZING' | 'ERROR'
type FailedAt = 'SELECT' | 'UPLOAD' | 'ORGANIZE' | null
type StoredUploadReference = { objectPath: string; mimeType: string; byteSize: number }

type SameOriginUploadResult =
  | { ok: true; objectPath: string; mimeType: string; byteSize: number }
  | { ok: false; code?: string }

export function KnowledgeFileUploader() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false)
  const [phase, setPhase] = useState<UploadPhase>('IDLE')
  const [failedAt, setFailedAt] = useState<FailedAt>(null)
  const [storedUpload, setStoredUpload] = useState<StoredUploadReference | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const busy = phase === 'UPLOADING' || phase === 'ORGANIZING'

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null
    setSelectedFile(file)
    setPrivacyConfirmed(false)
    setPhase(file ? 'READY' : 'IDLE')
    setFailedAt(null)
    setStoredUpload(null)
    setMessage(null)
  }

  function clearSelection() {
    if (busy) return
    if (inputRef.current) inputRef.current.value = ''
    setSelectedFile(null)
    setPrivacyConfirmed(false)
    setPhase('IDLE')
    setFailedAt(null)
    setStoredUpload(null)
    setMessage(null)
  }

  function chooseAnotherFile() {
    if (busy) return
    inputRef.current?.click()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    const file = selectedFile ?? inputRef.current?.files?.[0] ?? null
    if (!file || file.size <= 0) return fail('Seleziona un file da caricare.', 'SELECT')
    if (file.size > MAX_KNOWLEDGE_UPLOAD_BYTES) return fail('Il file supera il limite di 20 MB. Scegline uno più piccolo.', 'SELECT')

    const localMimeType = normalizeKnowledgeUploadMime(file.type, file.name)
    if (!isAllowedKnowledgeUploadMime(localMimeType)) return fail('Questo formato non è supportato. Usa PDF, immagini, DOCX, TXT o Markdown.', 'SELECT')

    const filenameCheck = inspectFilenameForPilot(file.name)
    if (!filenameCheck.allowed) return fail(pilotPrivacyErrorMessage(filenameCheck) ?? 'Il nome del file contiene dati non ammessi nel pilot anonimo.', 'SELECT')

    if (localMimeType === 'text/plain' || localMimeType === 'text/markdown') {
      const textCheck = inspectFreeTextForPilot(await file.text())
      if (!textCheck.allowed) return fail(pilotPrivacyErrorMessage(textCheck) ?? 'Il file contiene dati non ammessi nel pilot anonimo.', 'SELECT')
    }

    if (!privacyConfirmed) return fail('Conferma che il file non contiene dati personali di studenti o terzi prima del caricamento.', 'SELECT')

    if (failedAt === 'ORGANIZE' && storedUpload) {
      setFailedAt(null)
      await organizeStoredFile(file, storedUpload)
      return
    }

    setFailedAt(null)
    setStoredUpload(null)
    setPhase('UPLOADING')
    setMessage('Controllo privacy superato. Il file selezionato resta qui mentre metto al sicuro l’originale nel tuo spazio privato.')

    let uploadResponse: Response
    try {
      uploadResponse = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: {
          'content-type': localMimeType,
          'x-docente-file-name': encodeURIComponent(file.name),
          'x-docente-file-size': String(file.size),
          'x-docente-anonymous-confirmed': 'true',
        },
        body: file,
      })
    } catch (error) {
      console.error('Knowledge same-origin upload network failure', error)
      return fail('Il collegamento si è interrotto prima di salvare il file. Il file selezionato è ancora qui: puoi riprovare.', 'UPLOAD')
    }

    const uploadResult = await readUploadResult(uploadResponse)
    if (!uploadResponse.ok || !uploadResult?.ok) {
      console.error('Knowledge same-origin upload rejected', { status: uploadResponse.status, result: uploadResult })
      return fail(uploadFailureMessage(uploadResponse.status, uploadResult?.ok === false ? uploadResult.code : undefined), 'UPLOAD')
    }

    const reference: StoredUploadReference = {
      objectPath: uploadResult.objectPath,
      mimeType: uploadResult.mimeType,
      byteSize: uploadResult.byteSize,
    }
    setStoredUpload(reference)
    await organizeStoredFile(file, reference)
  }

  async function organizeStoredFile(file: File, reference: StoredUploadReference) {
    setPhase('ORGANIZING')
    setMessage('L’originale è al sicuro. Ora preparo una versione leggibile e ricercabile senza sostituire la fonte.')

    const result = await finalizeKnowledgeFileUpload({
      objectPath: reference.objectPath,
      originalName: file.name,
      mimeType: reference.mimeType,
      byteSize: reference.byteSize,
    })

    if (!result.ok) return fail(finalizeMessage(result.code), 'ORGANIZE')

    setStoredUpload(null)
    router.push(`/knowledge/${result.assetId}`)
    router.refresh()
  }

  function fail(text: string, stage: Exclude<FailedAt, null>) {
    setFailedAt(stage)
    setPhase('ERROR')
    setMessage(text)
  }

  const steps = uploadSteps({ phase, failedAt, hasFile: Boolean(selectedFile) })
  const feedbackTitle = phase === 'UPLOADING'
    ? 'Sto mettendo al sicuro l’originale'
    : phase === 'ORGANIZING'
      ? 'Originale al sicuro'
      : phase === 'ERROR'
        ? 'Serve un intervento'
        : null

  const submitLabel = phase === 'UPLOADING'
    ? 'Caricamento…'
    : phase === 'ORGANIZING'
      ? 'Organizzazione…'
      : phase === 'ERROR' && failedAt === 'ORGANIZE' && storedUpload
        ? 'Riprova organizzazione'
        : phase === 'ERROR' && selectedFile
          ? 'Riprova'
          : selectedFile
            ? 'Carica e organizza'
            : 'Seleziona prima un file'

  return (
    <form className="knowledgeUploadForm knowledgeUploadComfort" onSubmit={handleSubmit}>
      <label className={`fileDrop ${selectedFile ? 'hasSelection' : ''}`}>
        <input
          ref={inputRef}
          name="file"
          type="file"
          required
          disabled={busy}
          accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
        />
        <span className="fileDropIcon" aria-hidden>{selectedFile ? '✓' : '↑'}</span>
        <strong>{selectedFile ? 'File individuato' : 'Scegli un file'}</strong>
        <small>{selectedFile ? 'Resta selezionato anche se qualcosa si interrompe, così non devi ricominciare da capo.' : 'PDF, immagini, DOCX, TXT o Markdown · massimo 20 MB'}</small>
      </label>

      {selectedFile ? (
        <div className="selectedFileCard" role="status" aria-live="polite" aria-atomic="true">
          <span className="selectedFileCheck" aria-hidden>✓</span>
          <div className="selectedFileBody">
            <strong>{storedUpload ? 'Originale già al sicuro' : 'Pronto a caricare'}</strong>
            <span title={selectedFile.name}>{selectedFile.name}</span>
            <small>{fileTypeLabel(selectedFile)} · {formatFileSize(selectedFile.size)}</small>
          </div>
          <div className="selectedFileActions">
            <button type="button" className="selectedFileAction" onClick={chooseAnotherFile} disabled={busy}>Cambia</button>
            <button type="button" className="selectedFileAction danger" onClick={clearSelection} disabled={busy}>Rimuovi</button>
          </div>
        </div>
      ) : null}

      {selectedFile ? (
        <label className="knowledgeUploadTrust">
          <input type="checkbox" checked={privacyConfirmed} onChange={(event) => setPrivacyConfirmed(event.currentTarget.checked)} disabled={busy} />{' '}
          Confermo che questo file è destinato al pilot anonimo e non contiene nomi, recapiti, dati familiari, sanitari o altri dati personali di studenti o terzi.
        </label>
      ) : null}

      {selectedFile ? (
        <ol className="knowledgeUploadJourney" aria-label="Avanzamento del caricamento">
          {steps.map((step, index) => (
            <li key={step.label} className={`knowledgeUploadStep ${step.state}`} aria-current={step.state === 'active' ? 'step' : undefined}>
              <span className="knowledgeUploadStepMark" aria-hidden>{step.state === 'done' ? '✓' : step.state === 'problem' ? '!' : index + 1}</span>
              <span className="knowledgeUploadStepText"><strong>{step.label}</strong><small>{step.hint}</small></span>
            </li>
          ))}
        </ol>
      ) : null}

      {message && feedbackTitle ? (
        <div className={`knowledgeUploadFeedback ${phase === 'ERROR' ? 'error' : 'progress'}`} role={phase === 'ERROR' ? 'alert' : 'status'} aria-live="polite">
          <span className="knowledgeUploadFeedbackIcon" aria-hidden>{phase === 'ERROR' ? '!' : phase === 'ORGANIZING' ? '✓' : '↥'}</span>
          <div><strong>{feedbackTitle}</strong><p>{message}</p></div>
        </div>
      ) : null}

      <button type="submit" disabled={busy || !selectedFile}>{submitLabel}</button>
      {selectedFile && !busy ? <p className="knowledgeUploadTrust">TXT e Markdown vengono controllati anche nel contenuto prima dell’invio. Per PDF, DOCX e immagini il controllo automatico pre-upload non può garantire l’assenza di dati personali: la tua verifica resta obbligatoria. Prima salvo l’originale; solo dopo lo organizzo.</p> : null}
    </form>
  )
}

function uploadSteps(input: { phase: UploadPhase; failedAt: FailedAt; hasFile: boolean }) {
  const { phase, failedAt, hasFile } = input
  return [
    {
      label: 'File scelto',
      hint: 'Resta disponibile finché decidi tu',
      state: failedAt === 'SELECT' ? 'problem' : hasFile ? 'done' : 'pending',
    },
    {
      label: 'Originale al sicuro',
      hint: 'Copiato nello spazio privato',
      state: failedAt === 'UPLOAD' ? 'problem' : phase === 'UPLOADING' ? 'active' : phase === 'ORGANIZING' || failedAt === 'ORGANIZE' ? 'done' : 'pending',
    },
    {
      label: 'Organizzato',
      hint: 'Leggibile e pronto per la ricerca',
      state: failedAt === 'ORGANIZE' ? 'problem' : phase === 'ORGANIZING' ? 'active' : 'pending',
    },
  ] as const
}

async function readUploadResult(response: Response): Promise<SameOriginUploadResult | null> {
  try { return await response.json() as SameOriginUploadResult } catch { return null }
}

function uploadFailureMessage(status: number, code?: string) {
  if (status === 401) return 'La sessione è scaduta prima del salvataggio. Ricarica la pagina e accedi di nuovo.'
  if (code === 'privacy_confirmation_required') return 'Conferma esplicitamente che il file è privo di dati personali prima del caricamento.'
  if (code === 'privacy_blocked') return 'Il controllo privacy ha rilevato dati non ammessi nel pilot anonimo. Rimuovili e riprova.'
  if (status === 413 || code === 'too_large') return 'Il file supera il limite di 20 MB. Scegline uno più piccolo.'
  if (status === 415 || code === 'unsupported') return 'Questo formato non è supportato. Usa PDF, immagini, DOCX, TXT o Markdown.'
  if (code === 'size_mismatch') return 'Il trasferimento è arrivato incompleto. Il file selezionato è ancora qui: riprova.'
  if (status >= 500) return 'Il file non è stato salvato nello spazio privato. Il file selezionato è ancora qui: puoi riprovare tra poco.'
  return `Il trasferimento non è riuscito (${status}). Il file selezionato è ancora qui: puoi riprovare.`
}

function fileTypeLabel(file: File) {
  const extension = file.name.split('.').pop()?.toUpperCase()
  if (extension && extension.length <= 8) return extension
  return file.type || 'File'
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kilobytes = bytes / 1024
  if (kilobytes < 1024) return `${kilobytes < 10 ? kilobytes.toFixed(1) : Math.round(kilobytes)} KB`
  const megabytes = kilobytes / 1024
  return `${megabytes.toFixed(megabytes < 10 ? 1 : 0)} MB`
}

function finalizeMessage(code: 'missing' | 'too_large' | 'unsupported' | 'invalid_path' | 'invalid_pdf' | 'visual_unavailable' | 'parse_failed') {
  if (code === 'too_large') return 'Il file supera il limite di 20 MB.'
  if (code === 'unsupported') return 'Questo formato non è supportato.'
  if (code === 'invalid_pdf') return 'L’originale è al sicuro, ma questo PDF non è leggibile oppure è incompleto. Scarica di nuovo il documento originale e riprova.'
  if (code === 'visual_unavailable') return 'L’originale è al sicuro. Questo contenuto richiede una lettura visiva che non è ancora attiva in questo ambiente.'
  if (code === 'parse_failed') return 'L’originale è al sicuro, ma non sono riuscito a organizzarlo automaticamente. Puoi riprovare l’organizzazione senza ricaricare la fonte.'
  return 'Non sono riuscito a completare l’organizzazione in modo sicuro. L’originale non è stato sostituito.'
}
