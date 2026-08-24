'use client'

import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { finalizeKnowledgeFileUpload } from './upload-actions'
import {
  isAllowedKnowledgeUploadMime,
  MAX_KNOWLEDGE_UPLOAD_BYTES,
  normalizeKnowledgeUploadMime,
} from './upload-policy'

type UploadPhase = 'IDLE' | 'UPLOADING' | 'ORGANIZING' | 'ERROR'

type SameOriginUploadResult =
  | { ok: true; objectPath: string; mimeType: string; byteSize: number }
  | { ok: false; code?: string }

export function KnowledgeFileUploader() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<UploadPhase>('IDLE')
  const [message, setMessage] = useState<string | null>(null)
  const busy = phase === 'UPLOADING' || phase === 'ORGANIZING'

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null
    setSelectedFile(file)
    setPhase('IDLE')
    setMessage(null)
  }

  function clearSelection() {
    if (busy) return
    if (inputRef.current) inputRef.current.value = ''
    setSelectedFile(null)
    setPhase('IDLE')
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
    if (!file || file.size <= 0) {
      fail('Seleziona un file da caricare.')
      return
    }
    if (file.size > MAX_KNOWLEDGE_UPLOAD_BYTES) {
      fail('Il file supera il limite di 20 MB. Scegline uno più piccolo.')
      return
    }

    const localMimeType = normalizeKnowledgeUploadMime(file.type, file.name)
    if (!isAllowedKnowledgeUploadMime(localMimeType)) {
      fail('Questo formato non è supportato. Usa PDF, immagini, DOCX, TXT o Markdown.')
      return
    }

    setPhase('UPLOADING')
    setMessage('Sto trasferendo l’originale nel tuo spazio privato…')

    let uploadResponse: Response
    try {
      uploadResponse = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: {
          'content-type': localMimeType,
          'x-docente-file-name': encodeURIComponent(file.name),
          'x-docente-file-size': String(file.size),
        },
        body: file,
      })
    } catch (error) {
      console.error('Knowledge same-origin upload network failure', error)
      fail('Il collegamento con DOCENTE OS si è interrotto durante il trasferimento. Riprova.')
      return
    }

    const uploadResult = await readUploadResult(uploadResponse)
    if (!uploadResponse.ok || !uploadResult?.ok) {
      console.error('Knowledge same-origin upload rejected', {
        status: uploadResponse.status,
        result: uploadResult,
      })
      fail(uploadFailureMessage(uploadResponse.status, uploadResult?.ok === false ? uploadResult.code : undefined))
      return
    }

    setPhase('ORGANIZING')
    setMessage('Originale al sicuro. Ora lo sto organizzando nella Conoscenza…')

    const result = await finalizeKnowledgeFileUpload({
      objectPath: uploadResult.objectPath,
      originalName: file.name,
      mimeType: uploadResult.mimeType,
      byteSize: uploadResult.byteSize,
    })

    if (!result.ok) {
      fail(finalizeMessage(result.code))
      return
    }

    router.push(`/knowledge/${result.assetId}`)
    router.refresh()
  }

  function fail(text: string) {
    setPhase('ERROR')
    setMessage(text)
  }

  return (
    <form className="knowledgeUploadForm" onSubmit={handleSubmit}>
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
        <strong>{selectedFile ? 'File individuato' : 'PDF, immagini, DOCX, TXT o Markdown'}</strong>
        <small>
          {selectedFile
            ? 'Controlla il file selezionato prima di avviare il caricamento.'
            : 'L’originale viene trasferito nel tuo spazio privato e poi organizzato nella Conoscenza.'}
        </small>
      </label>

      {selectedFile ? (
        <div className="selectedFileCard" role="status" aria-live="polite" aria-atomic="true">
          <span className="selectedFileCheck" aria-hidden>✓</span>
          <div className="selectedFileBody">
            <strong>File selezionato</strong>
            <span title={selectedFile.name}>{selectedFile.name}</span>
            <small>{fileTypeLabel(selectedFile)} · {formatFileSize(selectedFile.size)}</small>
          </div>
          <div className="selectedFileActions">
            <button type="button" className="selectedFileAction" onClick={chooseAnotherFile} disabled={busy}>Cambia</button>
            <button type="button" className="selectedFileAction danger" onClick={clearSelection} disabled={busy}>Rimuovi</button>
          </div>
        </div>
      ) : null}

      {message ? <div className="knowledgeFeedback" role={phase === 'ERROR' ? 'alert' : 'status'} aria-live="polite">{message}</div> : null}
      <button type="submit" disabled={busy || !selectedFile}>
        {phase === 'UPLOADING'
          ? 'Caricamento…'
          : phase === 'ORGANIZING'
            ? 'Organizzazione…'
            : selectedFile
              ? 'Carica e organizza'
              : 'Seleziona prima un file'}
      </button>
    </form>
  )
}

async function readUploadResult(response: Response): Promise<SameOriginUploadResult | null> {
  try {
    return await response.json() as SameOriginUploadResult
  } catch {
    return null
  }
}

function uploadFailureMessage(status: number, code?: string) {
  if (status === 401) return 'La sessione è scaduta. Ricarica la pagina e accedi di nuovo.'
  if (status === 413 || code === 'too_large') return 'Il file supera il limite di 20 MB.'
  if (status === 415 || code === 'unsupported') return 'Questo formato non è supportato.'
  if (code === 'size_mismatch') return 'Il trasferimento è arrivato incompleto. Riprova con lo stesso file.'
  if (status >= 500) return 'Lo spazio privato non ha accettato il file. Puoi riprovare tra poco.'
  return `Il trasferimento non è riuscito (${status}). Puoi riprovare.`
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
  if (code === 'invalid_pdf') return 'L’originale è stato conservato, ma questo PDF non è leggibile oppure è incompleto. Scarica di nuovo il documento originale e riprova.'
  if (code === 'visual_unavailable') return 'L’originale è stato conservato, ma questo contenuto richiede la lettura visiva, che non è ancora attiva su questo ambiente.'
  if (code === 'parse_failed') return 'L’originale è stato conservato, ma non sono riuscito a organizzarlo automaticamente. Puoi riprovare più tardi.'
  return 'Non sono riuscito a completare il caricamento in modo sicuro. Riprova.'
}