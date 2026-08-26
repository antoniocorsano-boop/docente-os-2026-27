'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { getDocumentProxy } from 'unpdf'
import {
  classifyLocalPdfForVisualPreflight,
  MAX_LOCAL_VISUAL_PDF_PAGES,
  type LocalPdfVisualPreflightState,
} from '@/core/privacy/local-pdf-visual-preflight'

type Point = { x: number; y: number }
type Props = { file: File; disabled: boolean; onPrepared: (file: File | null) => void }
const GAP = 24
const MAX_PAGE_DIMENSION = 1800
const MAX_COMPOSITE_HEIGHT = 12000

export function LocalSinglePagePdfPrivacyWorkbench(props: Props) {
  return <Session key={`${props.file.name}:${props.file.size}:${props.file.lastModified}`} {...props} />
}

function Session({ file, disabled, onPrepared }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sourceRef = useRef<HTMLCanvasElement | null>(null)
  const startRef = useRef<Point | null>(null)
  const onPreparedRef = useRef(onPrepared)
  const [state, setState] = useState<LocalPdfVisualPreflightState | 'ANALYZING'>('ANALYZING')
  const [pages, setPages] = useState(0)
  const [ready, setReady] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [redactions, setRedactions] = useState(0)
  const [message, setMessage] = useState('Analizzo il PDF localmente. Nessun byte viene inviato.')

  useEffect(() => { onPreparedRef.current = onPrepared }, [onPrepared])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      onPreparedRef.current(null)
      try {
        const bytes = new Uint8Array(await file.arrayBuffer())
        const classification = await classifyLocalPdfForVisualPreflight(bytes)
        if (cancelled) return
        setState(classification.state)
        setPages(classification.totalPages ?? 0)
        if (classification.state === 'NATIVE_TEXT_ONLY') {
          setMessage('PDF testuale: continua nel preflight testuale ordinario.')
          return
        }
        if (classification.state === 'MULTI_PAGE_VISUAL_BLOCKED') {
          setMessage(`Il PDF supera il limite locale di ${MAX_LOCAL_VISUAL_PDF_PAGES} pagine. Resta bloccato e nessun originale viene inviato.`)
          return
        }
        if (classification.state === 'FAILED' || !classification.totalPages) {
          setMessage('Non riesco a verificare questo PDF localmente. Resta bloccato.')
          return
        }
        await renderPdf(bytes, classification.totalPages)
        if (cancelled) return
        setReady(true)
        setMessage(classification.totalPages === 1
          ? 'Pagina pronta per la revisione locale.'
          : `${classification.totalPages} pagine pronte: scorri e controllale tutte.`)
      } catch (error) {
        console.error('Local PDF privacy workbench failed', error)
        if (!cancelled) {
          setState('FAILED')
          setMessage('Non riesco ad aprire questo PDF localmente. Nessun byte è stato inviato.')
        }
      }
    })()
    return () => { cancelled = true; sourceRef.current = null }
  }, [file])

  async function renderPdf(bytes: Uint8Array, count: number) {
    if (count < 1 || count > MAX_LOCAL_VISUAL_PDF_PAGES) throw new Error('PDF outside local review boundary')
    const pdf = await getDocumentProxy(bytes)
    const rendered: HTMLCanvasElement[] = []
    for (let n = 1; n <= count; n += 1) {
      const page = await pdf.getPage(n)
      const base = page.getViewport({ scale: 1 })
      const scale = Math.min(2, MAX_PAGE_DIMENSION / Math.max(base.width, base.height))
      const viewport = page.getViewport({ scale })
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = Math.max(1, Math.round(viewport.width))
      pageCanvas.height = Math.max(1, Math.round(viewport.height))
      const ctx = pageCanvas.getContext('2d', { alpha: false })
      if (!ctx) throw new Error('Canvas unavailable')
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      await page.render({ canvas: pageCanvas, canvasContext: ctx, viewport }).promise
      rendered.push(pageCanvas)
    }
    const width = Math.max(...rendered.map((c) => c.width))
    const height = rendered.reduce((sum, c) => sum + c.height, 0) + GAP * Math.max(0, rendered.length - 1)
    if (height > MAX_COMPOSITE_HEIGHT) throw new Error('Composite review surface too large')
    const source = document.createElement('canvas')
    source.width = width; source.height = height
    const ctx = source.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('Composite canvas unavailable')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height)
    let y = 0
    for (const pageCanvas of rendered) {
      ctx.drawImage(pageCanvas, Math.round((width - pageCanvas.width) / 2), y)
      y += pageCanvas.height + GAP
    }
    sourceRef.current = source
    drawSource(source)
  }

  function drawSource(source: HTMLCanvasElement) {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = source.width; canvas.height = source.height
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(source, 0, 0)
  }

  function point(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * event.currentTarget.width / rect.width, y: (event.clientY - rect.top) * event.currentTarget.height / rect.height }
  }

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!ready || disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    startRef.current = point(event)
  }

  function pointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const start = startRef.current; startRef.current = null
    if (!start || !ready || disabled) return
    const end = point(event)
    const x = Math.min(start.x, end.x), y = Math.min(start.y, end.y)
    const width = Math.abs(end.x - start.x), height = Math.abs(end.y - start.y)
    if (width < 4 || height < 4) return
    const ctx = event.currentTarget.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#000'; ctx.fillRect(x, y, width, height)
    setRedactions((value) => value + 1); setConfirmed(false); onPreparedRef.current(null)
    setMessage('Area oscurata nella copia locale. Continua a controllare tutte le pagine.')
  }

  function reset() {
    if (!sourceRef.current || disabled) return
    drawSource(sourceRef.current); setRedactions(0); setConfirmed(false); onPreparedRef.current(null)
    setMessage('Copia locale ripristinata. Ricontrolla tutte le pagine.')
  }

  async function prepare() {
    const canvas = canvasRef.current
    if (!canvas || !ready || !confirmed || disabled) return
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) { setMessage('Non riesco a creare la copia locale. Nessun originale è stato inviato.'); return }
    onPreparedRef.current(new File([blob], 'scansione-anonima.png', { type: 'image/png', lastModified: Date.now() }))
    setMessage(`Copia anonima pronta: verrà inviato solo il PNG ricodificato delle ${pages === 1 ? 'pagina' : `${pages} pagine`}.`)
  }

  if (state === 'NATIVE_TEXT_ONLY' || state === 'MULTI_PAGE_VISUAL_BLOCKED' || state === 'FAILED' || state === 'ANALYZING') {
    return <p role="status" aria-live="polite" className="knowledgeUploadTrust">{message}</p>
  }

  return <section aria-label="Revisione privacy locale del PDF" style={{ border: '1px solid var(--border, #d7d7d7)', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
    <div><strong>Revisione locale del PDF</strong><p style={{ margin: '4px 0 0' }}>Il PDF resta nel browser. Controlla {pages === 1 ? 'la pagina' : `tutte le ${pages} pagine`} e oscura eventuali dettagli personali.</p></div>
    <div style={{ maxHeight: 620, overflow: 'auto', borderRadius: 8, background: '#f4f4f4' }}>
      <canvas ref={canvasRef} onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={() => { startRef.current = null }} style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none', cursor: ready && !disabled ? 'crosshair' : 'default' }} aria-label="Anteprima locale del PDF: trascina per oscurare un’area" />
    </div>
    <small>{redactions ? `${redactions} aree oscurate nella copia locale.` : 'Se il documento è già anonimo, controlla comunque tutte le pagine.'}</small>
    <label><input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.currentTarget.checked); onPreparedRef.current(null) }} disabled={!ready || disabled} /> Ho controllato {pages === 1 ? 'tutta la pagina' : `tutte le ${pages} pagine`} e nella copia visibile non restano dati personali di studenti o terzi.</label>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><button type="button" onClick={() => void prepare()} disabled={!ready || !confirmed || disabled}>Prepara copia anonima</button><button type="button" onClick={reset} disabled={!ready || disabled}>Ripristina copia locale</button></div>
    <p role="status" aria-live="polite" style={{ margin: 0 }}>{message}</p>
  </section>
}
