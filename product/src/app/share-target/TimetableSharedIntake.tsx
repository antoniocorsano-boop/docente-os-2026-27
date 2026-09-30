'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { getDocumentProxy } from 'unpdf'
import { analyzeTimetableImport } from '@/app/orario/actions'

type Rect = { x: number; y: number; width: number; height: number }
type Point = { x: number; y: number }

type Props = {
  file: File
  onBeforeSubmit: () => Promise<void> | void
}

const MAX_PAGES = 5
const GAP = 20
const MAX_PAGE_DIMENSION = 1800
const MAX_COMPOSITE_HEIGHT = 12000

export function TimetableSharedIntake({ file, onBeforeSubmit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sourceRef = useRef<HTMLCanvasElement | null>(null)
  const startRef = useRef<Point | null>(null)
  const [ready, setReady] = useState(false)
  const [pages, setPages] = useState(0)
  const [selections, setSelections] = useState<Rect[]>([])
  const [teacherLabel, setTeacherLabel] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(() => dateFromFilename(file.name) ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Preparo il documento localmente. Nessun byte viene inviato.')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
          throw new Error('Per ora l’importazione locale dall’app Condividi è disponibile per i PDF.')
        }
        const bytes = new Uint8Array(await file.arrayBuffer())
        const pdf = await getDocumentProxy(bytes)
        if (pdf.numPages < 1 || pdf.numPages > MAX_PAGES) {
          throw new Error(`Il PDF ha ${pdf.numPages} pagine: il flusso locale per l’orario supporta fino a ${MAX_PAGES} pagine.`)
        }

        const rendered: HTMLCanvasElement[] = []
        for (let n = 1; n <= pdf.numPages; n += 1) {
          const page = await pdf.getPage(n)
          const base = page.getViewport({ scale: 1 })
          const scale = Math.min(2, MAX_PAGE_DIMENSION / Math.max(base.width, base.height))
          const viewport = page.getViewport({ scale })
          const pageCanvas = document.createElement('canvas')
          pageCanvas.width = Math.max(1, Math.round(viewport.width))
          pageCanvas.height = Math.max(1, Math.round(viewport.height))
          const ctx = pageCanvas.getContext('2d', { alpha: false })
          if (!ctx) throw new Error('Canvas non disponibile')
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
          await page.render({ canvas: pageCanvas, canvasContext: ctx, viewport }).promise
          rendered.push(pageCanvas)
        }

        const width = Math.max(...rendered.map((item) => item.width))
        const height = rendered.reduce((sum, item) => sum + item.height, 0) + GAP * Math.max(0, rendered.length - 1)
        if (height > MAX_COMPOSITE_HEIGHT) throw new Error('Il documento è troppo alto per la selezione locale.')

        const source = document.createElement('canvas')
        source.width = width
        source.height = height
        const ctx = source.getContext('2d', { alpha: false })
        if (!ctx) throw new Error('Canvas composito non disponibile')
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, width, height)
        let y = 0
        for (const pageCanvas of rendered) {
          ctx.drawImage(pageCanvas, Math.round((width - pageCanvas.width) / 2), y)
          y += pageCanvas.height + GAP
        }

        if (cancelled) return
        sourceRef.current = source
        setPages(pdf.numPages)
        setReady(true)
        setMessage('Seleziona soltanto la riga o le celle che appartengono al tuo orario. Il resto del documento non verrà inviato.')
        draw()
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Non riesco a preparare questo PDF localmente.')
        }
      }
    })()
    return () => { cancelled = true; sourceRef.current = null }
  }, [file])

  useEffect(() => { draw() }, [selections])

  function draw() {
    const source = sourceRef.current
    const canvas = canvasRef.current
    if (!source || !canvas) return
    canvas.width = source.width
    canvas.height = source.height
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return
    ctx.drawImage(source, 0, 0)
    if (selections.length) {
      ctx.save()
      ctx.lineWidth = Math.max(4, source.width / 250)
      ctx.strokeStyle = '#111'
      ctx.setLineDash([14, 10])
      for (const rect of selections) ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
      ctx.restore()
    }
  }

  function point(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * event.currentTarget.width / rect.width,
      y: (event.clientY - rect.top) * event.currentTarget.height / rect.height,
    }
  }

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!ready || busy) return
    event.currentTarget.setPointerCapture(event.pointerId)
    startRef.current = point(event)
  }

  function pointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const start = startRef.current
    startRef.current = null
    if (!start || !ready || busy) return
    const end = point(event)
    const rect = {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    }
    if (rect.width < 20 || rect.height < 12) return
    setSelections((current) => [...current, rect])
    setMessage('Area aggiunta. Puoi selezionare altre celle oppure preparare la proposta.')
  }

  async function submit() {
    if (!sourceRef.current || !selections.length || !teacherLabel.trim() || !effectiveFrom || busy) return
    setBusy(true)
    try {
      const derivative = await cropSelections(sourceRef.current, selections)
      const safeFile = new File([derivative], 'orario-selezione-locale.png', {
        type: 'image/png',
        lastModified: Date.now(),
      })
      const data = new FormData()
      data.set('file', safeFile)
      data.set('teacherLabel', teacherLabel.trim())
      data.set('effectiveFrom', effectiveFrom)
      await onBeforeSubmit()
      setMessage('Invio soltanto le aree selezionate. Il PDF completo è stato rimosso dallo staging locale.')
      await analyzeTimetableImport(data)
    } catch (error) {
      console.error('Timetable minimized share intake failed', error)
      setBusy(false)
      setMessage('Non sono riuscito a preparare la proposta. Il PDF originale non è stato inviato.')
    }
  }

  return (
    <section aria-label="Importazione locale dell’orario" style={{ display: 'grid', gap: 12 }}>
      <div className="knowledgeFeedback" role="status">
        <strong>Importa nell’Orario senza inviare il quadro completo</strong>
        <p style={{ margin: '4px 0 0' }}>
          Seleziona solo la tua riga o le tue celle. Docente OS creerà una nuova immagine locale con quelle sole aree e userà quella per preparare la proposta.
        </p>
      </div>

      <div style={{ maxHeight: 620, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)' }}>
        <canvas
          ref={canvasRef}
          onPointerDown={pointerDown}
          onPointerUp={pointerUp}
          onPointerCancel={() => { startRef.current = null }}
          aria-label="Anteprima locale dell’orario: trascina per selezionare le tue celle"
          style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none', cursor: ready && !busy ? 'crosshair' : 'default' }}
        />
      </div>

      <small>{pages ? `${pages} pagina${pages === 1 ? '' : 'e'} · ${selections.length} area${selections.length === 1 ? '' : 'e'} selezionata${selections.length === 1 ? '' : 'e'}` : 'Preparazione in corso…'}</small>

      <div style={{ display: 'grid', gap: 8 }}>
        <label>
          <span>Cognome o etichetta con cui compari nell’orario</span>
          <input value={teacherLabel} onChange={(event) => setTeacherLabel(event.currentTarget.value)} maxLength={120} autoComplete="off" placeholder="Es. ROSSI" />
          <small>Serve solo a riconoscere le celle selezionate; non viene salvato come dato dell’orario.</small>
        </label>
        <label>
          <span>Orario valido dal</span>
          <input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.currentTarget.value)} />
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" onClick={() => void submit()} disabled={!ready || !selections.length || !teacherLabel.trim() || !effectiveFrom || busy}>
          {busy ? 'Preparo la proposta…' : 'Prepara proposta di orario'}
        </button>
        <button type="button" onClick={() => { setSelections([]); setMessage('Selezione cancellata. Il PDF resta soltanto sul dispositivo.') }} disabled={!selections.length || busy}>
          Cancella selezione
        </button>
      </div>

      <p role="status" aria-live="polite" style={{ margin: 0 }}>{message}</p>
      <p className="knowledgeUploadTrust" style={{ margin: 0 }}>
        Il PDF completo non viene caricato in Conoscenza e non viene conservato come fonte. La proposta resta modificabile e richiede conferma prima di cambiare la bozza dell’Orario.
      </p>
    </section>
  )
}

async function cropSelections(source: HTMLCanvasElement, selections: Rect[]) {
  const padding = 8
  const normalized = selections
    .map((rect) => ({
      x: Math.max(0, Math.floor(rect.x)),
      y: Math.max(0, Math.floor(rect.y)),
      width: Math.min(source.width - Math.max(0, Math.floor(rect.x)), Math.ceil(rect.width)),
      height: Math.min(source.height - Math.max(0, Math.floor(rect.y)), Math.ceil(rect.height)),
    }))
    .filter((rect) => rect.width > 0 && rect.height > 0)

  const width = Math.max(...normalized.map((rect) => rect.width))
  const height = normalized.reduce((sum, rect) => sum + rect.height, 0) + padding * Math.max(0, normalized.length - 1)
  const output = document.createElement('canvas')
  output.width = width
  output.height = height
  const ctx = output.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Canvas di minimizzazione non disponibile')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)

  let y = 0
  for (const rect of normalized) {
    ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, y, rect.width, rect.height)
    y += rect.height + padding
  }

  const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Impossibile creare il derivato locale')
  return blob
}

function dateFromFilename(filename: string) {
  const match = filename.match(/\b(\d{1,2})[-_.](\d{1,2})[-_.](20\d{2})\b/)
  if (!match) return null
  const [, day, month, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}
