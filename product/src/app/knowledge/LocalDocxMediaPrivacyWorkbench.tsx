'use client'

import { useEffect, useRef, useState } from 'react'
import mammoth from 'mammoth'
import { inspectFreeTextForPilot, pilotPrivacyErrorMessage } from '@/core/privacy/anonymization-guard'

export type DocxMode = 'ANALYZING' | 'TEXT_ONLY' | 'MEDIA_REQUIRES_DERIVATIVE' | 'FAILED'

type WorkbenchProps = {
  file: File
  disabled: boolean
  onPrepared: (file: File | null) => void
  onModeChange: (mode: DocxMode) => void
}

const MEDIA_MARKER = new TextEncoder().encode('word/media/')

export function LocalDocxMediaPrivacyWorkbench(props: WorkbenchProps) {
  const fileKey = `${props.file.name}:${props.file.size}:${props.file.lastModified}`
  return <LocalDocxMediaPrivacyWorkbenchSession key={fileKey} {...props} />
}

function LocalDocxMediaPrivacyWorkbenchSession({ file, disabled, onPrepared, onModeChange }: WorkbenchProps) {
  const onPreparedRef = useRef(onPrepared)
  const onModeChangeRef = useRef(onModeChange)
  const [mode, setMode] = useState<DocxMode>('ANALYZING')
  const [text, setText] = useState('')
  const [mediaNotNeeded, setMediaNotNeeded] = useState(false)
  const [message, setMessage] = useState('Analizzo il DOCX localmente. Nessun byte viene inviato.')

  useEffect(() => { onPreparedRef.current = onPrepared }, [onPrepared])
  useEffect(() => { onModeChangeRef.current = onModeChange }, [onModeChange])

  useEffect(() => {
    let cancelled = false
    onPreparedRef.current(null)
    onModeChangeRef.current('ANALYZING')

    void (async () => {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        const containsMedia = containsSequence(bytes, MEDIA_MARKER)
        const result = await mammoth.extractRawText({ arrayBuffer })
        if (cancelled) return

        const extracted = normalizeText(result.value)
        if (!hasUsableText(extracted)) {
          setMode('FAILED')
          onModeChangeRef.current('FAILED')
          setMessage('Il DOCX non espone testo sufficiente per creare una derivazione anonima affidabile. Resta bloccato e nessun byte viene inviato.')
          return
        }

        setText(extracted)
        if (!containsMedia) {
          setMode('TEXT_ONLY')
          onModeChangeRef.current('TEXT_ONLY')
          setMessage('DOCX solo testuale: continuerà nel preflight ordinario prima della persistenza.')
          return
        }

        setMode('MEDIA_REQUIRES_DERIVATIVE')
        onModeChangeRef.current('MEDIA_REQUIRES_DERIVATIVE')
        setMessage('Il DOCX contiene media. L’originale resta sul dispositivo: puoi conservare solo una derivazione testuale se le immagini non sono necessarie.')
      } catch (error) {
        console.error('Local DOCX privacy workbench failed', error)
        if (!cancelled) {
          setMode('FAILED')
          onModeChangeRef.current('FAILED')
          setMessage('Non riesco ad analizzare questo DOCX localmente in modo affidabile. Nessun byte è stato inviato.')
        }
      }
    })()

    return () => { cancelled = true }
  }, [file])

  if (mode === 'ANALYZING' || mode === 'TEXT_ONLY' || mode === 'FAILED') {
    return <p role="status" aria-live="polite" className="knowledgeUploadTrust">{message}</p>
  }

  const privacy = inspectFreeTextForPilot(text)
  const privacyMessage = privacy.allowed ? null : pilotPrivacyErrorMessage(privacy)

  function prepareTextDerivative() {
    const normalized = normalizeText(text)
    const check = inspectFreeTextForPilot(normalized)
    if (!mediaNotNeeded || !hasUsableText(normalized) || !check.allowed || disabled) {
      onPreparedRef.current(null)
      return
    }

    const safeFile = new File([`${normalized}\n`], 'documento-anonimo.txt', {
      type: 'text/plain',
      lastModified: Date.now(),
    })
    onPreparedRef.current(safeFile)
    setMessage('Derivazione testuale anonima pronta. Verrà inviato solo il TXT revisionato; DOCX originale e media restano sul dispositivo.')
  }

  return (
    <section aria-label="Revisione privacy locale del DOCX con media" style={{ border: '1px solid var(--border, #d7d7d7)', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
      <div>
        <strong>DOCX con immagini o media</strong>
        <p style={{ margin: '4px 0 0' }}>Per il pilot anonimo il DOCX originale non viene caricato. Puoi conservare soltanto il testo estratto localmente, dopo averlo revisionato. Le immagini incorporate vengono escluse dal derivato.</p>
      </div>

      <label style={{ display: 'grid', gap: 6 }}>
        <span><strong>Testo che verrà conservato</strong></span>
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.currentTarget.value)
            onPreparedRef.current(null)
          }}
          disabled={disabled}
          rows={12}
          spellCheck
          style={{ width: '100%', resize: 'vertical' }}
        />
      </label>

      {privacyMessage ? <p role="alert" className="knowledgeUploadTrust">{privacyMessage}</p> : null}

      <label className="knowledgeUploadTrust">
        <input
          type="checkbox"
          checked={mediaNotNeeded}
          onChange={(event) => {
            setMediaNotNeeded(event.currentTarget.checked)
            onPreparedRef.current(null)
          }}
          disabled={disabled}
        />{' '}
        Ho verificato il testo e confermo che immagini, grafici o altri media incorporati non sono necessari per il contenuto che voglio conservare.
      </label>

      <button type="button" onClick={prepareTextDerivative} disabled={disabled || !mediaNotNeeded || !privacy.allowed || !hasUsableText(text)}>
        Prepara derivazione testuale anonima
      </button>

      <p role="status" aria-live="polite" className="knowledgeUploadTrust">{message}</p>
    </section>
  )
}

function containsSequence(bytes: Uint8Array, needle: Uint8Array) {
  if (!needle.length || bytes.length < needle.length) return false
  outer: for (let offset = 0; offset <= bytes.length - needle.length; offset += 1) {
    for (let index = 0; index < needle.length; index += 1) {
      if (bytes[offset + index] !== needle[index]) continue outer
    }
    return true
  }
  return false
}

function normalizeText(value: string) {
  return value.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function hasUsableText(value: string) {
  const alphanumeric = value.match(/[\p{L}\p{N}]/gu)?.length ?? 0
  return alphanumeric >= 20
}
