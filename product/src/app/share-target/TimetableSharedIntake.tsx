'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { getDocumentProxy } from 'unpdf'
import { analyzeMinimizedTimetableImport } from '@/app/orario/actions'
import { MAX_KNOWLEDGE_UPLOAD_BYTES } from '@/app/knowledge/upload-policy'
import { clamp, clampRectToBounds, dateFromFilename, derivativeContextLabel, isValidOrdinal, parseOrdinal, type Rect } from './timetable-share-helpers'

type Point = { x: number; y: number }
type Selection = Rect & { id: string; weekday: number | null; ordinal: number | null }

type Props = {
  file: File
  onBeforeSubmit: () => Promise<void> | void
  onCandidateAccepted?: (candidateId: string) => void
}

const MAX_PAGES = 5
const GAP = 20
const MAX_PAGE_DIMENSION = 1800
const MAX_COMPOSITE_HEIGHT = 12000

export function TimetableSharedIntake({ file, onBeforeSubmit, onCandidateAccepted }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<Point | null>(null)
  const [keyboardCursor, setKeyboardCursor] = useState<Point | null>(null)
  const [keyboardStart, setKeyboardStart] = useState<Point | null>(null)
  const [ready, setReady] = useState(false)
  const [pages, setPages] = useState(0)
  const [selections, setSelections] = useState<Selection[]>([])
  const [sourceFingerprint, setSourceFingerprint] = useState<string | null>(null)
  const [teacherLabel, setTeacherLabel] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(() => dateFromFilename(file.name) ?? '')
  const [replaceReviewedCandidate, setReplaceReviewedCandidate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [acceptedCandidateId, setAcceptedCandidateId] = useState<string | null>(null)
  const [touchSelectMode, setTouchSelectMode] = useState(false)
  const [message, setMessage] = useState('Preparo il documento localmente. Nessun byte viene inviato.')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
          throw new Error('Per ora l’importazione locale dall’app Condividi è disponibile per i PDF.')
        }
        if (file.size > MAX_KNOWLEDGE_UPLOAD_BYTES) {
          throw new Error(`Il PDF supera il limite di ${Math.round(MAX_KNOWLEDGE_UPLOAD_BYTES / 1024 / 1024)} MB per l’acquisizione locale.`)
        }
        const buffer = await file.arrayBuffer()
        const fingerprint = await sha256Hex(buffer)
        const pdf = await getDocumentProxy(new Uint8Array(buffer))
        if (pdf.numPages < 1 || pdf.numPages > MAX_PAGES) {
          throw new Error(`Il PDF ha ${pdf.numPages} pagine: il flusso locale per l’orario supporta fino a ${MAX_PAGES} pagine.`)
        }

        const layouts: Array<{ page: Awaited<ReturnType<typeof pdf.getPage>>; viewport: ReturnType<Awaited<ReturnType<typeof pdf.getPage>>['getViewport']>; x: number; y: number }> = []
        let width = 0
        let height = 0
        for (let n = 1; n <= pdf.numPages; n += 1) {
          const page = await pdf.getPage(n)
          const base = page.getViewport({ scale: 1 })
          const scale = Math.min(2, MAX_PAGE_DIMENSION / Math.max(base.width, base.height))
          const viewport = page.getViewport({ scale })
          width = Math.max(width, Math.max(1, Math.round(viewport.width)))
          layouts.push({ page, viewport, x: 0, y: height })
          height += Math.max(1, Math.round(viewport.height)) + (n < pdf.numPages ? GAP : 0)
        }
        if (height > MAX_COMPOSITE_HEIGHT) throw new Error('Il documento è troppo alto per la selezione locale.')

        const canvas = canvasRef.current
        if (!canvas) throw new Error('Canvas non disponibile')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) throw new Error('Canvas non disponibile')
        ctx.fillStyle = canvasSurfaceColor()
        ctx.fillRect(0, 0, width, height)

        const scratch = document.createElement('canvas')
        const scratchCtx = scratch.getContext('2d', { alpha: false })
        if (!scratchCtx) throw new Error('Canvas temporaneo non disponibile')

        for (const layout of layouts) {
          const pageWidth = Math.max(1, Math.round(layout.viewport.width))
          const pageHeight = Math.max(1, Math.round(layout.viewport.height))
          scratch.width = pageWidth
          scratch.height = pageHeight
          scratchCtx.fillStyle = canvasSurfaceColor()
          scratchCtx.fillRect(0, 0, pageWidth, pageHeight)
          await layout.page.render({
            canvas: scratch,
            canvasContext: scratchCtx,
            viewport: layout.viewport,
          }).promise
          layout.x = Math.round((width - pageWidth) / 2)
          ctx.drawImage(scratch, layout.x, layout.y)
          scratch.width = 1
          scratch.height = 1
        }

        if (cancelled) return
        setSourceFingerprint(fingerprint)
        setPages(pdf.numPages)
        setKeyboardCursor({ x: canvas.width / 2, y: Math.min(canvas.height - 1, 120) })
        setReady(true)
        setMessage('Seleziona soltanto la riga o le celle che appartengono al tuo orario. Il resto del documento non verrà inviato.')
      } catch (error) {
        if (cancelled) return
        startRef.current = null
        setReady(false)
        setSourceFingerprint(null)
        setSelections([])
        setKeyboardStart(null)
        setKeyboardCursor(null)
        const renderMessage = error instanceof Error ? error.message : 'Non riesco a preparare questo PDF localmente.'
        try {
          await onBeforeSubmit()
          setMessage(`${renderMessage} Il file sorgente è stato rimosso dallo staging locale.`)
        } catch (cleanupError) {
          console.error('Timetable local staging cleanup failed after render error', cleanupError)
          setMessage(`${renderMessage} Non sono riuscito a rimuovere il file dallo staging locale. Mantieni aperta questa schermata e usa “Annulla acquisizione e rimuovi il file locale” finché la rimozione non riesce.`)
        }
      }
    })()
    return () => { cancelled = true }
  }, [file, onBeforeSubmit])

  function point(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) * canvas.width / rect.width
    const y = (event.clientY - rect.top) * canvas.height / rect.height
    return {
      x: clamp(x, 0, canvas.width),
      y: clamp(y, 0, canvas.height),
    }
  }

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!ready || busy) return
    if (event.pointerType === 'touch' && !touchSelectMode) return
    event.currentTarget.setPointerCapture(event.pointerId)
    startRef.current = point(event)
  }

  function pointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const start = startRef.current
    startRef.current = null
    if (!start || !ready || busy) return
    addSelection(start, point(event))
    if (event.pointerType === 'touch') setTouchSelectMode(false)
  }

  function addSelection(start: Point, end: Point) {
    const rect = {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    }
    if (rect.width < 20 || rect.height < 12) return
    setSelections((current) => [...current, {
      ...rect,
      id: crypto.randomUUID(),
      weekday: null,
      ordinal: null,
    }])
    setMessage('Area aggiunta. Puoi selezionare altre celle oppure preparare la proposta.')
  }

  function keyboardSelection(event: ReactKeyboardEvent<HTMLCanvasElement>) {
    if (!ready || busy || !canvasRef.current) return
    const source = canvasRef.current
    const current = keyboardCursor ?? { x: source.width / 2, y: source.height / 2 }
    const step = event.shiftKey ? 40 : 12

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!keyboardStart) {
        setKeyboardStart(current)
        setMessage('Selezione da tastiera avviata. Usa le frecce e premi Invio per confermare l’area.')
      } else {
        addSelection(keyboardStart, current)
        setKeyboardStart(null)
      }
      return
    }

    const delta = event.key === 'ArrowLeft' ? { x: -step, y: 0 }
      : event.key === 'ArrowRight' ? { x: step, y: 0 }
        : event.key === 'ArrowUp' ? { x: 0, y: -step }
          : event.key === 'ArrowDown' ? { x: 0, y: step }
            : null
    if (!delta) return
    event.preventDefault()
    const next = {
      x: clamp(current.x + delta.x, 0, source.width),
      y: clamp(current.y + delta.y, 0, source.height),
    }
    setKeyboardCursor(next)
    requestAnimationFrame(() => ensureKeyboardCursorVisible(next))
  }

  async function submit() {
    const source = canvasRef.current
    if (!source || !sourceFingerprint || !selections.length || selections.some((item) => !item.weekday || !isValidOrdinal(item.ordinal)) || !teacherLabel.trim() || !effectiveFrom || busy || acceptedCandidateId) return
    setBusy(true)
    try {
      const derivative = await cropSelections(source, selections, teacherLabel.trim())
      const safeFile = new File([derivative], 'orario-selezione-locale.png', {
        type: 'image/png',
        lastModified: Date.now(),
      })
      const data = new FormData()
      data.set('file', safeFile)
      data.set('teacherLabel', teacherLabel.trim())
      data.set('effectiveFrom', effectiveFrom)
      data.set('originalSourceFingerprint', sourceFingerprint)
      data.set('sourceMode', 'LOCAL_MINIMIZED_SHARE')
      if (replaceReviewedCandidate) data.set('replaceReviewedCandidate', 'yes')

      const result = await analyzeMinimizedTimetableImport(data)

      if (!result || !result.ok) {
        const code = result?.code ?? 'persist_failed'
        if (isRecoverableImportFailure(code)) {
          setBusy(false)
          setMessage(messageForImportFailure(code))
          return
        }
        try {
          await onBeforeSubmit()
        } catch (cleanupError) {
          console.error('Timetable local staging cleanup failed after terminal server result', cleanupError)
          setBusy(false)
          setMessage(`${messageForImportFailure(code)} La rimozione del PDF locale non è riuscita: usa Annulla acquisizione e riprova finché lo staging viene eliminato.`)
          return
        }
        setBusy(false)
        setMessage(messageForImportFailure(code))
        return
      }

      setAcceptedCandidateId(result.candidateId)
      onCandidateAccepted?.(result.candidateId)
      try {
        await onBeforeSubmit()
      } catch (cleanupError) {
        console.error('Timetable local staging cleanup failed after candidate acceptance', cleanupError)
        setBusy(false)
        setMessage('La proposta è stata creata, ma il PDF completo non è ancora stato rimosso dallo staging locale. Riprova la rimozione: al successo aprirò direttamente la revisione già creata, senza rieseguire l’analisi.')
        return
      }

      setMessage('Proposta preparata. Il PDF completo è stato rimosso dallo staging locale.')
      window.location.assign(reviewUrl(result.candidateId))
    } catch (error) {
      console.error('Timetable minimized share intake failed', error)
      setBusy(false)
      setMessage('Non sono riuscito a preparare la proposta. Il PDF originale resta disponibile solo nello staging locale per consentire la correzione o l’annullamento.')
    }
  }

  async function retryAcceptedCleanup() {
    if (!acceptedCandidateId || busy) return
    setBusy(true)
    try {
      await onBeforeSubmit()
      window.location.assign(reviewUrl(acceptedCandidateId))
    } catch (cleanupError) {
      console.error('Timetable local staging cleanup retry failed', cleanupError)
      setBusy(false)
      setMessage('La proposta resta salvata, ma il PDF locale non è ancora stato rimosso. Riprova la rimozione prima di uscire.')
    }
  }

  function updateSelection(id: string, patch: Partial<Pick<Selection, 'weekday' | 'ordinal'>>) {
    setSelections((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  function ensureKeyboardCursorVisible(cursor: Point) {
    const viewport = viewportRef.current
    const canvas = canvasRef.current
    if (!viewport || !canvas || canvas.height <= 0) return
    const scaleY = canvas.clientHeight / canvas.height
    const y = cursor.y * scaleY
    const margin = 48
    if (y < viewport.scrollTop + margin) {
      viewport.scrollTo({ top: Math.max(0, y - margin) })
    } else if (y > viewport.scrollTop + viewport.clientHeight - margin) {
      viewport.scrollTo({ top: Math.max(0, y - viewport.clientHeight + margin) })
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

      <div ref={viewportRef} style={{ maxHeight: 620, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <canvas
            ref={canvasRef}
            role="application"
            tabIndex={0}
            onPointerDown={pointerDown}
            onPointerUp={pointerUp}
            onPointerCancel={() => { startRef.current = null }}
            onKeyDown={keyboardSelection}
            aria-label="Anteprima locale dell’orario: trascina oppure usa tastiera per selezionare le tue celle"
            aria-describedby="timetable-selection-help"
            style={{ width: '100%', height: 'auto', display: 'block', touchAction: touchSelectMode ? 'none' : 'pan-y', cursor: ready && !busy ? 'crosshair' : 'default' }}
          />
          {canvasRef.current?.width && canvasRef.current?.height ? (
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {selections.map((selection) => (
                <span key={selection.id} style={{
                  position: 'absolute',
                  left: `${selection.x / canvasRef.current!.width * 100}%`,
                  top: `${selection.y / canvasRef.current!.height * 100}%`,
                  width: `${selection.width / canvasRef.current!.width * 100}%`,
                  height: `${selection.height / canvasRef.current!.height * 100}%`,
                  border: '2px dashed currentColor',
                  boxSizing: 'border-box',
                }} />
              ))}
              {keyboardCursor ? (
                <span style={{
                  position: 'absolute',
                  left: `${keyboardCursor.x / canvasRef.current.width * 100}%`,
                  top: `${keyboardCursor.y / canvasRef.current.height * 100}%`,
                  width: 20,
                  height: 20,
                  border: '2px solid currentColor',
                  transform: 'translate(-50%, -50%)',
                  boxSizing: 'border-box',
                }} />
              ) : null}
              {keyboardCursor && keyboardStart ? (
                <span style={{
                  position: 'absolute',
                  left: `${Math.min(keyboardStart.x, keyboardCursor.x) / canvasRef.current.width * 100}%`,
                  top: `${Math.min(keyboardStart.y, keyboardCursor.y) / canvasRef.current.height * 100}%`,
                  width: `${Math.abs(keyboardCursor.x - keyboardStart.x) / canvasRef.current.width * 100}%`,
                  height: `${Math.abs(keyboardCursor.y - keyboardStart.y) / canvasRef.current.height * 100}%`,
                  border: '2px dashed currentColor',
                  boxSizing: 'border-box',
                }} />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <small id="timetable-selection-help">
        {pages ? `${pages} pagina${pages === 1 ? '' : 'e'} · ${selections.length} area${selections.length === 1 ? '' : 'e'} selezionata${selections.length === 1 ? '' : 'e'}` : 'Preparazione in corso…'}
        {' '}Da tastiera: porta il focus sull’anteprima, usa le frecce per spostarti, premi Invio per iniziare e di nuovo Invio per chiudere l’area. Maiusc + frecce accelera lo spostamento.
      </small>

      <button
        type="button"
        aria-pressed={touchSelectMode}
        onClick={() => {
          setTouchSelectMode((current) => !current)
          setMessage(touchSelectMode
            ? 'Scorrimento touch riattivato.'
            : 'Modalità selezione touch attiva: trascina una sola area, poi lo scorrimento verrà riattivato.')
        }}
        disabled={!ready || busy}
      >
        {touchSelectMode ? 'Torna a scorrere' : 'Seleziona area su schermo touch'}
      </button>

      {selections.length ? (
        <div style={{ display: 'grid', gap: 8 }} aria-label="Contesto delle aree selezionate">
          {selections.map((selection, index) => (
            <div key={selection.id} className="knowledgeFeedback" style={{ display: 'grid', gap: 8 }}>
              <strong>Area {index + 1}</strong>
              <label>
                <span>Giorno</span>
                <select
                  value={selection.weekday ?? ''}
                  onChange={(event) => updateSelection(selection.id, { weekday: Number(event.currentTarget.value) || null })}
                >
                  <option value="">Seleziona…</option>
                  {WEEKDAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                </select>
              </label>
              <label>
                <span>Ora</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={selection.ordinal ?? ''}
                  onChange={(event) => updateSelection(selection.id, { ordinal: parseOrdinal(event.currentTarget.value) })}
                />
              </label>
              <button type="button" onClick={() => setSelections((current) => current.filter((item) => item.id !== selection.id))} disabled={busy}>
                Rimuovi area
              </button>
            </div>
          ))}
        </div>
      ) : null}

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
        <label>
          <input
            type="checkbox"
            checked={replaceReviewedCandidate}
            onChange={(event) => setReplaceReviewedCandidate(event.currentTarget.checked)}
          />
          <span>Se questo stesso documento ha già una proposta corretta manualmente, autorizzo a sostituirla con questa nuova estrazione.</span>
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" onClick={() => void submit()} disabled={!ready || !sourceFingerprint || !selections.length || selections.some((item) => !item.weekday || !isValidOrdinal(item.ordinal)) || !teacherLabel.trim() || !effectiveFrom || busy || Boolean(acceptedCandidateId)}>
          {busy ? 'Preparo la proposta…' : 'Prepara proposta di orario'}
        </button>
        {acceptedCandidateId ? (
          <button type="button" onClick={() => void retryAcceptedCleanup()} disabled={busy}>
            Rimuovi il PDF locale e apri la revisione
          </button>
        ) : null}
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

async function cropSelections(source: HTMLCanvasElement, selections: Selection[], teacherLabel: string) {
  const padding = 8
  const normalized = selections
    .map((rect) => ({
      ...clampRectToBounds(rect, source.width, source.height),
      weekday: rect.weekday,
      ordinal: rect.ordinal,
    }))
    .filter((rect) => rect.width > 0 && rect.height > 0)

  const labelHeight = 44
  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')
  if (!measureCtx) throw new Error('Canvas di misura non disponibile')
  measureCtx.font = '600 22px sans-serif'
  const labelWidth = Math.ceil(Math.max(...normalized.map((rect) => {
    if (!rect.weekday || !isValidOrdinal(rect.ordinal)) return 0
    return measureCtx.measureText(derivativeContextLabel(teacherLabel, rect.weekday, rect.ordinal)).width
  }))) + 16
  const width = Math.max(...normalized.map((rect) => rect.width), labelWidth, 420)
  const height = normalized.reduce((sum, rect) => sum + labelHeight + rect.height, 0) + padding * Math.max(0, normalized.length - 1)
  const output = document.createElement('canvas')
  output.width = width
  output.height = height
  const ctx = output.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Canvas di minimizzazione non disponibile')
  ctx.fillStyle = canvasSurfaceColor()
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = canvasInkColor()
  ctx.font = '600 22px sans-serif'
  ctx.textBaseline = 'middle'

  let y = 0
  for (const rect of normalized) {
    if (!rect.weekday || !isValidOrdinal(rect.ordinal)) throw new Error('Contesto giorno/ora mancante')
    ctx.fillText(derivativeContextLabel(teacherLabel, rect.weekday, rect.ordinal), 8, y + labelHeight / 2)
    y += labelHeight
    ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, y, rect.width, rect.height)
    y += rect.height + padding
  }

  const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Impossibile creare il derivato locale')
  return blob
}

function canvasSurfaceColor() {
  return getComputedStyle(document.body).backgroundColor
}

function canvasInkColor() {
  return getComputedStyle(document.body).color
}


const WEEKDAYS = [
  { value: 1, label: 'Lunedì' },
  { value: 2, label: 'Martedì' },
  { value: 3, label: 'Mercoledì' },
  { value: 4, label: 'Giovedì' },
  { value: 5, label: 'Venerdì' },
  { value: 6, label: 'Sabato' },
] as const

async function sha256Hex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}


function isRecoverableImportFailure(code: string) {
  return code === 'invalid_date'
    || code === 'teacher_required'
    || code === 'parse_failed'
    || code === 'no_rows'
    || code === 'replace_confirmation_required'
    || code === 'persist_failed'
}

function reviewUrl(candidateId: string) {
  return `/orario?importCandidate=${encodeURIComponent(candidateId)}&import=review`
}

function messageForImportFailure(code: string) {
  if (code === 'invalid_date') return 'La data non è valida per l’anno scolastico corrente. Correggila e riprova: il PDF resta nello staging locale per consentire il nuovo tentativo.'
  if (code === 'teacher_required') return 'Indica il cognome o l’etichetta docente e riprova: il PDF resta nello staging locale.'
  if (code === 'parse_failed' || code === 'no_rows') return 'Non riesco ancora a ricavare righe utili dalle aree scelte. Correggi la selezione e riprova: il PDF resta nello staging locale.'
  if (code === 'replace_confirmation_required') return 'Esiste già una proposta che contiene correzioni manuali. Se vuoi sostituirla, seleziona la conferma esplicita e riprova: il PDF resta nello staging locale.'
  if (code === 'already_applied') return 'Questo documento è già stato applicato alla bozza dell’orario. L’importazione è conclusa e il PDF locale viene rimosso.'
  if (code === 'invalid_content' || code === 'unsupported' || code === 'too_large') return 'Il file condiviso non supera i controlli di acquisizione. Il PDF locale viene rimosso; per riprovare usa un altro file dalla condivisione.'
  return 'Non sono riuscito a creare la proposta. Puoi correggere i dati e riprovare finché il PDF resta nello staging locale.'
}
