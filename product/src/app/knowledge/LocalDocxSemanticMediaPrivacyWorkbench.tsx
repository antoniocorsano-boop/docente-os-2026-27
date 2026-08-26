'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { inspectFreeTextForPilot, pilotPrivacyErrorMessage } from '@/core/privacy/anonymization-guard'
import {
  inspectDocxForLocalSemanticDerivative,
  type LocalDocxMediaPart,
} from '@/core/privacy/local-docx-media-semantic-preflight'
import { createSemanticDerivativeRevisionGate } from '@/core/privacy/semantic-derivative-revision-gate'
import { LocalImagePrivacyWorkbench } from './LocalImagePrivacyWorkbench'

export type SemanticDocxMode = 'ANALYZING' | 'TEXT_ONLY' | 'MEDIA_REVIEWABLE' | 'FAILED'
type DerivativeChoice = 'TEXT_ONLY' | 'PRESERVE_MEDIA' | null

type WorkbenchProps = {
  file: File
  disabled: boolean
  onPrepared: (file: File | null) => void
  onModeChange: (mode: SemanticDocxMode) => void
}

const COMPOSITE_WIDTH = 1600
const COMPOSITE_MARGIN = 80
const TEXT_LINE_HEIGHT = 34
const MAX_COMPOSITE_HEIGHT = 12000

export function LocalDocxSemanticMediaPrivacyWorkbench(props: WorkbenchProps) {
  const fileKey = `${props.file.name}:${props.file.size}:${props.file.lastModified}`
  return <LocalDocxSemanticMediaPrivacyWorkbenchSession key={fileKey} {...props} />
}

function LocalDocxSemanticMediaPrivacyWorkbenchSession({ file, disabled, onPrepared, onModeChange }: WorkbenchProps) {
  const onPreparedRef = useRef(onPrepared)
  const onModeChangeRef = useRef(onModeChange)
  const revisionGateRef = useRef(createSemanticDerivativeRevisionGate())
  const [mode, setMode] = useState<SemanticDocxMode>('ANALYZING')
  const [choice, setChoice] = useState<DerivativeChoice>(null)
  const [text, setText] = useState('')
  const [media, setMedia] = useState<LocalDocxMediaPart[]>([])
  const [reviewedMedia, setReviewedMedia] = useState<Array<File | null>>([])
  const [mediaNotNeeded, setMediaNotNeeded] = useState(false)
  const [wholeReviewConfirmed, setWholeReviewConfirmed] = useState(false)
  const [message, setMessage] = useState('Analizzo localmente testo e media del pacchetto. Nessun byte viene inviato.')

  useEffect(() => { onPreparedRef.current = onPrepared }, [onPrepared])
  useEffect(() => { onModeChangeRef.current = onModeChange }, [onModeChange])

  useEffect(() => {
    let cancelled = false
    revisionGateRef.current.invalidate()
    onPreparedRef.current(null)
    onModeChangeRef.current('ANALYZING')

    void (async () => {
      const result = await inspectDocxForLocalSemanticDerivative(new Uint8Array(await file.arrayBuffer()))
      if (cancelled) return

      if (!result.allowed) {
        setMode('FAILED')
        onModeChangeRef.current('FAILED')
        setMessage(`${result.reason} Nessun byte è stato inviato.`)
        return
      }

      setText(result.text)
      setMedia(result.media)
      setReviewedMedia(result.media.map(() => null))

      if (result.mode === 'DOCX_TEXT_ONLY') {
        setMode('TEXT_ONLY')
        onModeChangeRef.current('TEXT_ONLY')
        setMessage('DOCX solo testuale: continuerà nel preflight testuale ordinario.')
        return
      }

      setMode('MEDIA_REVIEWABLE')
      onModeChangeRef.current('MEDIA_REVIEWABLE')
      setMessage(`Ho verificato il pacchetto ed estratto localmente ${result.media.length} media referenziati. Scegli se conservare solo il testo oppure testo + media revisionati.`)
    })()

    return () => { cancelled = true }
  }, [file])

  const mediaFiles = useMemo(() => media.map(mediaPartToFile), [media])
  const textPrivacy = inspectFreeTextForPilot(text)
  const allMediaReviewed = reviewedMedia.length > 0 && reviewedMedia.every(Boolean)

  if (mode === 'ANALYZING' || mode === 'TEXT_ONLY' || mode === 'FAILED') {
    return <p role="status" aria-live="polite" className="knowledgeUploadTrust">{message}</p>
  }

  function invalidateSemanticDerivative() {
    revisionGateRef.current.invalidate()
    setWholeReviewConfirmed(false)
    onPreparedRef.current(null)
  }

  function selectChoice(nextChoice: Exclude<DerivativeChoice, null>) {
    invalidateSemanticDerivative()
    setChoice(nextChoice)
    setMediaNotNeeded(false)
    setMessage(nextChoice === 'TEXT_ONLY'
      ? 'Revisiona il testo e conferma che i media non siano necessari. Verrà prodotto solo un TXT.'
      : 'Revisiona il testo e ogni media. Verrà prodotto un nuovo PNG semantico, non una copia fedele del DOCX.')
  }

  function prepareTextOnlyDerivative() {
    const normalized = normalizeText(text)
    const privacy = inspectFreeTextForPilot(normalized)
    if (!mediaNotNeeded || !privacy.allowed || !hasUsableText(normalized) || disabled) {
      onPreparedRef.current(null)
      return
    }

    const safeFile = new File([`${normalized}\n`], 'documento-anonimo.txt', {
      type: 'text/plain',
      lastModified: Date.now(),
    })
    onPreparedRef.current(safeFile)
    setMessage('Derivazione testuale anonima pronta. Verrà inviato solo il TXT; DOCX originale e media restano sul dispositivo.')
  }

  async function prepareSemanticDerivative() {
    const normalizedText = normalizeText(text)
    const privacy = inspectFreeTextForPilot(normalizedText)
    if (!privacy.allowed || !allMediaReviewed || !wholeReviewConfirmed || disabled) {
      onPreparedRef.current(null)
      return
    }

    const compositionToken = revisionGateRef.current.beginComposition()
    if (!compositionToken) {
      onPreparedRef.current(null)
      return
    }

    const reviewedMediaSnapshot = [...reviewedMedia]
    if (reviewedMediaSnapshot.some((item) => !item)) {
      revisionGateRef.current.invalidate()
      setWholeReviewConfirmed(false)
      onPreparedRef.current(null)
      return
    }

    setMessage('Compongo localmente testo e media revisionati in un nuovo PNG semantico…')
    const blob = await composeSemanticPng(normalizedText, reviewedMediaSnapshot as File[])

    if (!revisionGateRef.current.isCurrent(compositionToken)) return

    if (!blob) {
      onPreparedRef.current(null)
      setMessage('La composizione locale supera i limiti sicuri o non può essere generata. Il DOCX originale non è stato inviato.')
      return
    }

    const safeFile = new File([blob], 'documento-semantico-anonimo.png', {
      type: 'image/png',
      lastModified: Date.now(),
    })
    onPreparedRef.current(safeFile)
    setMessage('Derivato semantico anonimo pronto. Verrà inviato solo il nuovo PNG; DOCX originale e media originali restano sul dispositivo.')
  }

  return (
    <section aria-label="Revisione locale del DOCX con media" style={{ border: '1px solid var(--border, #d7d7d7)', borderRadius: 12, padding: 12, display: 'grid', gap: 12 }}>
      <div>
        <strong>DOCX con immagini o media</strong>
        <p style={{ margin: '4px 0 0' }}>L’originale resta sul dispositivo. Puoi conservare solo il testo oppure creare un derivato semantico con testo e immagini revisionati.</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" onClick={() => selectChoice('TEXT_ONLY')} disabled={disabled}>Conserva solo il testo</button>
        <button type="button" onClick={() => selectChoice('PRESERVE_MEDIA')} disabled={disabled}>Conserva anche i media</button>
      </div>

      {choice ? (
        <label style={{ display: 'grid', gap: 6 }}>
          <span><strong>Testo da conservare</strong></span>
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.currentTarget.value)
              setMediaNotNeeded(false)
              invalidateSemanticDerivative()
            }}
            disabled={disabled}
            rows={12}
            spellCheck
            style={{ width: '100%', resize: 'vertical' }}
          />
        </label>
      ) : null}

      {choice && !textPrivacy.allowed ? <p role="alert" className="knowledgeUploadTrust">{pilotPrivacyErrorMessage(textPrivacy) ?? 'Il testo contiene dati non ammessi: correggili prima di preparare il derivato.'}</p> : null}

      {choice === 'TEXT_ONLY' ? (
        <>
          <label className="knowledgeUploadTrust">
            <input
              type="checkbox"
              checked={mediaNotNeeded}
              onChange={(event) => {
                setMediaNotNeeded(event.currentTarget.checked)
                onPreparedRef.current(null)
              }}
              disabled={disabled || !textPrivacy.allowed}
            />{' '}
            Ho revisionato il testo e confermo che immagini, grafici e altri media non sono necessari per il contenuto che voglio conservare.
          </label>
          <button type="button" onClick={prepareTextOnlyDerivative} disabled={disabled || !textPrivacy.allowed || !mediaNotNeeded || !hasUsableText(text)}>
            Prepara derivazione testuale anonima
          </button>
        </>
      ) : null}

      {choice === 'PRESERVE_MEDIA' ? (
        <>
          <p className="knowledgeUploadTrust">Il layout Word non verrà ricostruito. Tutte le parti media del pacchetto vengono prima validate localmente; i media referenziati dal documento sono poi mostrati nell’ordine di estrazione e revisionati uno per uno.</p>
          <div style={{ display: 'grid', gap: 14 }}>
            {mediaFiles.map((mediaFile, index) => (
              <section key={`${mediaFile.name}:${index}`} aria-label={`Media DOCX ${index + 1}`}>
                <p className="knowledgeUploadTrust"><strong>Media {index + 1} di {mediaFiles.length}</strong> · revisiona e oscura eventuali dettagli personali.</p>
                <LocalImagePrivacyWorkbench
                  file={mediaFile}
                  disabled={disabled}
                  onPrepared={(safeFile) => {
                    setReviewedMedia((current) => current.map((value, itemIndex) => itemIndex === index ? safeFile : value))
                    invalidateSemanticDerivative()
                  }}
                />
              </section>
            ))}
          </div>
          <label className="knowledgeUploadTrust">
            <input
              type="checkbox"
              checked={wholeReviewConfirmed}
              onChange={(event) => {
                const checked = event.currentTarget.checked
                onPreparedRef.current(null)
                setWholeReviewConfirmed(checked)
                if (checked) revisionGateRef.current.confirmCurrentRevision()
                else revisionGateRef.current.revokeConfirmation()
              }}
              disabled={disabled || !textPrivacy.allowed || !allMediaReviewed}
            />{' '}
            Ho revisionato il testo e tutti i media estratti. Nel derivato non restano dati personali di studenti o terzi e accetto che il layout Word originale non venga preservato.
          </label>
          <button type="button" onClick={() => void prepareSemanticDerivative()} disabled={disabled || !textPrivacy.allowed || !allMediaReviewed || !wholeReviewConfirmed}>
            Prepara derivato semantico anonimo
          </button>
        </>
      ) : null}

      <p role="status" aria-live="polite" className="knowledgeUploadTrust">{message}</p>
    </section>
  )
}

function mediaPartToFile(part: LocalDocxMediaPart) {
  const extension = part.contentType === 'image/jpeg' ? 'jpg' : part.contentType === 'image/webp' ? 'webp' : 'png'
  return new File([part.bytes], `media-${part.index + 1}.${extension}`, { type: part.contentType, lastModified: 0 })
}

function normalizeText(value: string) {
  return value.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function hasUsableText(value: string) {
  const alphanumeric = value.match(/[\p{L}\p{N}]/gu)?.length ?? 0
  return alphanumeric >= 20
}

async function composeSemanticPng(text: string, mediaFiles: File[]): Promise<Blob | null> {
  const bitmaps: ImageBitmap[] = []
  try {
    for (const file of mediaFiles) bitmaps.push(await createImageBitmap(file))

    const contentWidth = COMPOSITE_WIDTH - COMPOSITE_MARGIN * 2
    const lines = wrapPlainText(text, 82)
    const textHeight = Math.max(TEXT_LINE_HEIGHT * 2, lines.length * TEXT_LINE_HEIGHT + 80)
    const imageLayouts = bitmaps.map((bitmap) => {
      const scale = Math.min(1, contentWidth / bitmap.width, 1200 / bitmap.height)
      return { width: Math.max(1, Math.round(bitmap.width * scale)), height: Math.max(1, Math.round(bitmap.height * scale)) }
    })
    const totalHeight = COMPOSITE_MARGIN * 2 + textHeight + imageLayouts.reduce((sum, item) => sum + item.height + 70, 0)
    if (totalHeight > MAX_COMPOSITE_HEIGHT) return null

    const canvas = document.createElement('canvas')
    canvas.width = COMPOSITE_WIDTH
    canvas.height = Math.max(1, totalHeight)
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) return null

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#111111'
    context.textBaseline = 'top'

    let y = COMPOSITE_MARGIN
    context.font = 'bold 30px sans-serif'
    context.fillText('Derivato semantico anonimo', COMPOSITE_MARGIN, y)
    y += 52
    context.font = '28px sans-serif'
    for (const line of lines) {
      context.fillText(line, COMPOSITE_MARGIN, y, contentWidth)
      y += TEXT_LINE_HEIGHT
    }
    y += 40

    bitmaps.forEach((bitmap, index) => {
      const layout = imageLayouts[index]
      context.fillStyle = '#444444'
      context.font = '24px sans-serif'
      context.fillText(`Media revisionato ${index + 1}`, COMPOSITE_MARGIN, y)
      y += 36
      context.drawImage(bitmap, COMPOSITE_MARGIN, y, layout.width, layout.height)
      y += layout.height + 34
    })

    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  } catch (error) {
    console.error('DOCX semantic derivative composition failed', error)
    return null
  } finally {
    bitmaps.forEach((bitmap) => bitmap.close())
  }
}

function wrapPlainText(text: string, maxCharacters: number) {
  if (!text) return ['(nessun testo conservato)']
  const result: string[] = []
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (!words.length) {
      result.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (candidate.length > maxCharacters && line) {
        result.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    if (line) result.push(line)
  }
  return result
}
