'use client'

import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { finalizeKnowledgeFileUpload } from './upload-actions'
import {
  buildKnowledgeObjectPath,
  isAllowedKnowledgeUploadMime,
  KNOWLEDGE_BUCKET,
  MAX_KNOWLEDGE_UPLOAD_BYTES,
  normalizeKnowledgeUploadMime,
} from './upload-policy'

type UploadPhase = 'IDLE' | 'UPLOADING' | 'ORGANIZING' | 'ERROR'

export function KnowledgeFileUploader({ workspaceId }: { workspaceId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<UploadPhase>('IDLE')
  const [message, setMessage] = useState<string | null>(null)
  const busy = phase === 'UPLOADING' || phase === 'ORGANIZING'

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

    const mimeType = normalizeKnowledgeUploadMime(file.type, file.name)
    if (!isAllowedKnowledgeUploadMime(mimeType)) {
      fail('Questo formato non è supportato. Usa PDF, immagini, DOCX, TXT o Markdown.')
      return
    }

    const objectPath = buildKnowledgeObjectPath(workspaceId, file.name || 'asset', crypto.randomUUID())
    const supabase = createClient()

    setPhase('UPLOADING')
    setMessage('Sto trasferendo l’originale nel tuo spazio privato…')

    const { error: uploadError } = await supabase.storage.from(KNOWLEDGE_BUCKET).upload(objectPath, file, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    })

    if (uploadError) {
      console.error('Knowledge direct upload failed', uploadError.message)
      fail('Il trasferimento non è riuscito. Il file non è stato modificato: puoi riprovare.')
      return
    }

    setPhase('ORGANIZING')
    setMessage('Originale al sicuro. Ora lo sto organizzando nella Conoscenza…')

    const result = await finalizeKnowledgeFileUpload({
      objectPath,
      originalName: file.name,
      mimeType,
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
        <small>L’originale va direttamente nel tuo spazio privato. Non transita come allegato attraverso il server dell’app.</small>
      </label>
      {message ? <div className="knowledgeFeedback" role={phase === 'ERROR' ? 'alert' : 'status'} aria-live="polite">{message}</div> : null}
      <button type="submit" disabled={busy}>
        {phase === 'UPLOADING' ? 'Caricamento…' : phase === 'ORGANIZING' ? 'Organizzazione…' : 'Carica e organizza'}
      </button>
    </form>
  )
}

function finalizeMessage(code: 'missing' | 'too_large' | 'unsupported' | 'invalid_path' | 'parse_failed') {
  if (code === 'too_large') return 'Il file supera il limite di 20 MB.'
  if (code === 'unsupported') return 'Questo formato non è supportato.'
  if (code === 'parse_failed') return 'L’originale è stato conservato, ma non sono riuscito a organizzarlo automaticamente. Puoi riprovare più tardi.'
  return 'Non sono riuscito a completare il caricamento in modo sicuro. Riprova.'
}
