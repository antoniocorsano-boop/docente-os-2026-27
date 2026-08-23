'use client'

import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { finalizeKnowledgeFileUpload, requestKnowledgeUploadGrant } from './upload-actions'
import {
  isAllowedKnowledgeUploadMime,
  KNOWLEDGE_BUCKET,
  MAX_KNOWLEDGE_UPLOAD_BYTES,
  normalizeKnowledgeUploadMime,
} from './upload-policy'

type UploadPhase = 'IDLE' | 'AUTHORIZING' | 'UPLOADING' | 'ORGANIZING' | 'ERROR'

export function KnowledgeFileUploader() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<UploadPhase>('IDLE')
  const [message, setMessage] = useState<string | null>(null)
  const busy = phase === 'AUTHORIZING' || phase === 'UPLOADING' || phase === 'ORGANIZING'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    const file = inputRef.current?.files?.[0]
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

    setPhase('AUTHORIZING')
    setMessage('Preparo un trasferimento sicuro per questo file…')

    const grant = await requestKnowledgeUploadGrant({
      originalName: file.name,
      rawMimeType: file.type,
      byteSize: file.size,
    })

    if (!grant.ok) {
      fail(grantMessage(grant.code))
      return
    }

    const supabase = createClient()
    setPhase('UPLOADING')
    setMessage('Sto trasferendo l’originale nel tuo spazio privato…')

    const { error: uploadError } = await supabase.storage
      .from(KNOWLEDGE_BUCKET)
      .uploadToSignedUrl(grant.objectPath, grant.token, file, {
        contentType: grant.mimeType,
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('Knowledge signed upload failed', uploadError.message)
      fail('Il trasferimento non è riuscito. Il file non è stato modificato: puoi riprovare.')
      return
    }

    setPhase('ORGANIZING')
    setMessage('Originale al sicuro. Ora lo sto organizzando nella Conoscenza…')

    const result = await finalizeKnowledgeFileUpload({
      objectPath: grant.objectPath,
      originalName: file.name,
      mimeType: grant.mimeType,
      byteSize: file.size,
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
      <label className="fileDrop">
        <input
          ref={inputRef}
          name="file"
          type="file"
          required
          disabled={busy}
          accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp"
          onChange={() => {
            setPhase('IDLE')
            setMessage(null)
          }}
        />
        <span className="fileDropIcon" aria-hidden>↑</span>
        <strong>PDF, immagini, DOCX, TXT o Markdown</strong>
        <small>DOCENTE OS autorizza solo questo trasferimento; l’originale va poi direttamente nel tuo spazio privato.</small>
      </label>
      {message ? <div className="knowledgeFeedback" role={phase === 'ERROR' ? 'alert' : 'status'} aria-live="polite">{message}</div> : null}
      <button type="submit" disabled={busy}>
        {phase === 'AUTHORIZING'
          ? 'Preparazione…'
          : phase === 'UPLOADING'
            ? 'Caricamento…'
            : phase === 'ORGANIZING'
              ? 'Organizzazione…'
              : 'Carica e organizza'}
      </button>
    </form>
  )
}

function grantMessage(code: 'missing' | 'too_large' | 'unsupported' | 'authorization_failed') {
  if (code === 'too_large') return 'Il file supera il limite di 20 MB.'
  if (code === 'unsupported') return 'Questo formato non è supportato.'
  if (code === 'authorization_failed') return 'Non sono riuscito ad autorizzare il trasferimento. Ricarica la pagina e riprova.'
  return 'Seleziona nuovamente il file e riprova.'
}

function finalizeMessage(code: 'missing' | 'too_large' | 'unsupported' | 'invalid_path' | 'parse_failed') {
  if (code === 'too_large') return 'Il file supera il limite di 20 MB.'
  if (code === 'unsupported') return 'Questo formato non è supportato.'
  if (code === 'parse_failed') return 'L’originale è stato conservato, ma non sono riuscito a organizzarlo automaticamente. Puoi riprovare più tardi.'
  return 'Non sono riuscito a completare il caricamento in modo sicuro. Riprova.'
}
