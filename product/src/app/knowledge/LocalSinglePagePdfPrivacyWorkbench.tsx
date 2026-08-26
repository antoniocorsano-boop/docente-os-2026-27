'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { getDocumentProxy } from 'unpdf'
import { classifyLocalPdfForVisualPreflight, type LocalPdfVisualPreflightState } from '@/core/privacy/local-pdf-visual-preflight'

type Point = { x: number; y: number }
type WorkbenchProps = {
  file: File
  disabled: boolean
  onPrepared: (file: File | null) => void
}

export function LocalSinglePagePdfPrivacyWorkbench(props: WorkbenchProps) {
  const fileKey = `${props.file.name}:${props.file.size}:${props.file.lastModified}`
  return <LocalSinglePagePdfPrivacyWorkbenchSession key={fileKey} {...props} />
}

function LocalSinglePagePdfPrivacyWorkbenchSession({ file, disabled, onPrepared }: WorkbenchProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragStartRef = useRef<Point | null>(null)
  const onPreparedRef = useRef(onPrepared)
  const [state, setState] = useState<LocalPdfVisualPreflightState | 'ANALYZING'>('ANALYZING')
  const [ready, setReady] = useState(false)
  const [reviewConfirmed, setReviewConfirmed] = useState(false)
  const [redactionCount, setRedactionCount] = useState(0)
  const [message, setMessage] = useState<string | null>('Analizzo il PDF localmente. Nessun byte viene inviato.')

  useEffect(() => {
    onPreparedRef.current = onPrepared
  }, [onPrepared])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      onPreparedRef.current(null)
      try {
        const bytes = new Uint8Array(await file.arrayBuffer())
        const classification = await classifyLocalPdfForVisualPreflight(bytes)
        if (cancelled) return
        setState(classification.state)

        if (classification.state === 'NATIVE_TEXT_ONLY') {
          setMessage('PDF testuale: il controllo visuale non è necessario. Continuerà nel preflight testuale ordinario.')
          return
        }
        if (classification.state === 'MULTI_PAGE_VISUAL_BLOCKED') {
          setMessage('Questo PDF contiene più pagine e almeno una richiede lettura visuale. Resta bloccato: nessun originale verrà inviato.')
          return
        }
        if (classification.state === 'FAILED') {
          setMessage('Non riesco a classificare questo PDF localmente in modo affidabile. Resta bloccato e nessun byte viene inviato.')
          return
        }

        await renderSinglePage(bytes)
        if (cancelled) return
        setReady(true)
        setMessage('Scansione a pagina singola pronta per la revisione locale. Trascina sull’anteprima per oscurare eventuali dati personali.')
      } catch (error) {
        console.error('Local single-page PDF privacy workbench failed', error)
        if (!cancelled) {
          setState('FAILED')
          setMessage('Non riesco ad aprire questa scansione localmente. Nessun byte è stato inviato.')
        }
      }
    })()

    return () => {
      cancelled = true
      sourceCanvasRef.current = null
    }
  }, [file])

  async function renderSinglePage(bytes: Uint8Array) {
    const pdf = await getDocumentProxy(bytes)
    if (pdf.numPages !== 1) throw new Error('Expected exactly one PDF page')
    const page = await pdf.getPage(1)
    const baseViewport = page.getViewport({ scale: 1 })
    const maxDimension = 2200
    const scale = Math.min(2, maxDimension / Math.max(baseViewport.width, baseViewport.height))
    const viewport = page.getViewport({ scale })
    const sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = Math.max(1, Math.round(viewport.width))
    sourceCanvas.height = Math.max(1, Math.round(viewport.height))
    const sourceContext = sourceCanvas.getContext('2d', { alpha: false })
    if (!sourceContext) throw new Error('Canvas unavailable')
    sourceContext.fillStyle = '#ffffff'
    sourceContext.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height)
    await page.render({ canvas: sourceCanvas, canvasContext: sourceContext, viewport }).promise
    sourceCanvasRef.current = sourceCanvas
    drawSourceCanvas(sourceCanvas)
  }

  function drawSourceCanvas(sourceCanvas: HTMLCanvasElement) {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = sourceCanvas.width
    canvas.height = sourceCanvas.height
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) return
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(sourceCanvas, 0, 0)
  }

  function resetPdfCopy() {
    const sourceCanvas = sourceCanvasRef.current
    if (!sourceCanvas || disabled) return
    drawSourceCanvas(sourceCanvas)
    setRedactionCount(0)
    setReviewConfirmed(false)
    onPreparedRef.current(null)
    setMessage('Copia locale ripristinata. Ricontrolla tutta la pagina prima di prepararla.')
  }

  function canvasPoint(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!ready || disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartRef.current = canvasPoint(event)
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const start = dragStartRef.current
    dragStartRef.current = null
    if (!start || !ready || disabled) return

    const end = canvasPoint(event)
    const x = Math.min(start.x, end.x)
    const y = Math.min(start.y, end.y)
    const width = Math.abs(end.x - start.x)
    const height = Math.abs(end.y - start.y)
    if (width < 4 || height < 4) return

    const context = event.currentTarget.getContext('2d')
    if (!context) return
    context.fillStyle = '#000000'
    context.fillRect(x, y, width, height)
    setRedactionCount((value) => value + 1)
    setReviewConfirmed(false)
    onPreparedRef.current(null)
    setMessage('Area oscurata nella copia locale. Controlla che non restino dettagli identificativi.')
  }

  async function prepareSafeCopy() {
    const canvas = canvasRef.current
    if (!canvas || !ready || !reviewConfirmed || disabled) return
    setMessage('Creo localmente il PNG derivato senza conservare il PDF originale…')

    const blob = await canvasToPng(canvas)
    if (!blob) {
      setMessage('Non sono riuscito a creare la copia locale. Il PDF originale non è stato inviato.')
      onPreparedRef.current(null)
      return
    }

    const safeFile = new File([blob], 'scansione-anonima.png', { type: 'image/png', lastModified: Date.now() })
    onPreparedRef.current(safeFile)
    setMessage('Copia anonima pronta: verrà inviato solo il PNG ricodificato della pagina, non il PDF originale.')
  }

  if (state === 'NATIVE_TEXT_ONLY') {
    return <p role="status" aria-live="polite" className="knowledgeUploadTrust">{message}</p>
  }

  if (state === 'MULTI_PAGE_VISUAL_BLOCKED' || state === 'FAILED' || state === 'ANALYZING') {
    return <p role="status" aria-live="polite" className="knowledgeUploadTrust">{message}</p>
  }

  return (
    <section aria-label="Revisione privacy locale della scansione PDF" style={{ border: '1px solid var(--border, #d7d7d7)', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
      <div>
        <strong>Revisione locale della scansione</strong>
        <p style={{ margin: '4px 0 0' }}>Il PDF resta nel browser. Trascina sull’anteprima per oscurare nomi, volti, recapiti o altri dettagli personali. Verrà creato soltanto un PNG derivato.</p>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { dragStartRef.current = null }}
        style={{ width: '100%', maxHeight: 520, objectFit: 'contain', borderRadius: 8, background: '#f4f4f4', touchAction: 'none', cursor: ready && !disabled ? 'crosshair' : 'default' }}
        aria-label="Anteprima locale della scansione: trascina per oscurare un’area"
      />

      <small>{redactionCount ? `${redactionCount} area${redactionCount === 1 ? '' : 'e'} oscurata${redactionCount === 1 ? '' : 'e'} nella copia locale.` : 'Se la pagina è già priva di dati personali, puoi limitarti alla revisione completa.'}</small>

      <label>
        <input
          type="checkbox"
          checked={reviewConfirmed}
          onChange={(event) => {
            setReviewConfirmed(event.currentTarget.checked)
            onPreparedRef.current(null)
          }}
          disabled={!ready || disabled}
        />{' '}
        Ho controllato tutta la pagina e nella copia visibile non restano dati personali di studenti o terzi.
      </label>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" onClick={() => void prepareSafeCopy()} disabled={!ready || !reviewConfirmed || disabled}>Prepara copia anonima</button>
        <button type="button" onClick={resetPdfCopy} disabled={!ready || disabled}>Ripristina copia locale</button>
      </div>

      {message ? <p role="status" aria-live="polite" style={{ margin: 0 }}>{message}</p> : null}
    </section>
  )
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
}
