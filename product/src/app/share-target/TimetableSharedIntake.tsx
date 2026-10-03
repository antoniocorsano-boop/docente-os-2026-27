'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { getDocumentProxy } from 'unpdf'
import { analyzeMinimizedTimetableImport, analyzeRasterTimetableImport, persistLocallyExtractedTimetableImport } from '@/app/orario/actions'
import { rectFromPolygon } from '@/core/document-understanding/local-document-understanding'
import { LOCAL_OCR_TIMEOUT_MS, LocalDocumentOcrTimeoutError, localOcrDimensions, recognizeLocalDocumentImage, remainingLocalOcrBudgetMs } from '@/core/document-understanding/tesseract-local-ocr'
import { MAX_KNOWLEDGE_UPLOAD_BYTES } from '@/app/knowledge/upload-policy'
import { chooseTimetableExtractionStrategy, classifyTimetablePageTextLayer, clamp, clampRectToBounds, dateFromFilename, derivativeContextLabel, findTeacherTextAnchors, inferTeacherTimetableCells, isValidOrdinal, localOcrProgressLabel, parseOrdinal, type Rect, type TimetablePageTextKind, type TimetableTextAnchor } from './timetable-share-helpers'

type Point = { x: number; y: number }
type Selection = Rect & { id: string; weekday: number | null; ordinal: number | null; classLabel: string | null }
type SearchAnchor = TimetableTextAnchor
type PageRegion = Rect & { page: number; kind: TimetablePageTextKind }

type Props = {
  file: File
  onBeforeSubmit: () => Promise<void> | void
  onCandidateAccepted?: (candidateId: string) => void
  defaultEffectiveFrom?: string
  sourceMode?: 'LOCAL_MINIMIZED_SHARE' | 'LOCAL_MINIMIZED_UPLOAD'
}

const MAX_PAGES = 5
const GAP = 20
const MAX_PAGE_DIMENSION = 1800
const MAX_COMPOSITE_HEIGHT = 12000
const MAX_RASTER_DERIVATIVE_EDGE = 1400
const MAX_RASTER_DERIVATIVE_PIXELS = 5_000_000
const MAX_RASTER_DERIVATIVE_BYTES = 3 * 1024 * 1024

export function TimetableSharedIntake({
  file,
  onBeforeSubmit,
  onCandidateAccepted,
  defaultEffectiveFrom = '',
  sourceMode = 'LOCAL_MINIMIZED_SHARE',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<Point | null>(null)
  const searchAnchorsRef = useRef<SearchAnchor[]>([])
  const pageRegionsRef = useRef<PageRegion[]>([])
  const [keyboardCursor, setKeyboardCursor] = useState<Point | null>(null)
  const [keyboardStart, setKeyboardStart] = useState<Point | null>(null)
  const [ready, setReady] = useState(false)
  const [pages, setPages] = useState(0)
  const [selections, setSelections] = useState<Selection[]>([])
  const [sourceFingerprint, setSourceFingerprint] = useState<string | null>(null)
  const [teacherLabel, setTeacherLabel] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(() => dateFromFilename(file.name) ?? defaultEffectiveFrom)
  const [replaceReviewedCandidate, setReplaceReviewedCandidate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [acceptedCandidateId, setAcceptedCandidateId] = useState<string | null>(null)
  const [touchSelectMode, setTouchSelectMode] = useState(false)
  const [teacherMatches, setTeacherMatches] = useState<SearchAnchor[]>([])
  const [needsManualContext, setNeedsManualContext] = useState(false)
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

        const searchAnchors: SearchAnchor[] = []
        pageRegionsRef.current = []
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

          let pageKind: TimetablePageTextKind = 'RASTER'
          try {
            const textPage = layout.page as unknown as {
              getTextContent: () => Promise<{ items: Array<{ str?: string; transform?: number[]; width?: number; height?: number }> }>
            }
            const viewport = layout.viewport as unknown as {
              scale?: number
              convertToViewportPoint: (x: number, y: number) => [number, number]
            }
            const textContent = await textPage.getTextContent()
            pageKind = classifyTimetablePageTextLayer(textContent.items)
            for (const item of textContent.items) {
              const text = item.str?.trim()
              const transform = item.transform
              if (!text || !transform || transform.length < 6) continue
              const [x, baselineY] = viewport.convertToViewportPoint(transform[4] ?? 0, transform[5] ?? 0)
              const scale = viewport.scale ?? 1
              const itemHeight = Math.max(18, Math.abs(item.height ?? transform[3] ?? 10) * scale)
              searchAnchors.push({
                text,
                page: layouts.indexOf(layout) + 1,
                rect: {
                  x: layout.x + x,
                  y: layout.y + baselineY - itemHeight,
                  width: Math.max(36, Math.abs(item.width ?? 0) * scale),
                  height: itemHeight,
                },
              })
            }
          } catch {
            pageKind = 'RASTER'
          }

          pageRegionsRef.current.push({
            page: layouts.indexOf(layout) + 1,
            kind: pageKind,
            x: layout.x,
            y: layout.y,
            width: pageWidth,
            height: pageHeight,
          })

          scratch.width = 1
          scratch.height = 1
        }

        if (cancelled) return
        searchAnchorsRef.current = searchAnchors
        setTeacherMatches([])
        setNeedsManualContext(false)
        setSourceFingerprint(fingerprint)
        setPages(pdf.numPages)
        setKeyboardCursor({ x: canvas.width / 2, y: Math.min(canvas.height - 1, 120) })
        setReady(true)
        setMessage('Documento pronto. Inserisci il nominativo e Docente OS sceglierà automaticamente il percorso di lettura più adatto.')
      } catch (error) {
        if (cancelled) return
        startRef.current = null
        setReady(false)
        setSourceFingerprint(null)
        setSelections([])
        searchAnchorsRef.current = []
        pageRegionsRef.current = []
        setTeacherMatches([])
        setNeedsManualContext(false)
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

  async function findTeacher() {
    const label = teacherLabel.trim()
    if (!label || busy) {
      if (!label) {
        setTeacherMatches([])
        setMessage('Scrivi prima il cognome o l’etichetta con cui compari nell’orario.')
      }
      return
    }

    const matches = findTeacherTextAnchors(searchAnchorsRef.current, label)
    const inferred = inferTeacherTimetableCells(searchAnchorsRef.current, label)
    setTeacherMatches(matches)
    const extractionStrategy = chooseTimetableExtractionStrategy({
      pageKinds: pageRegionsRef.current.map((region) => region.kind),
      nativeTeacherMatches: matches.length,
    })

    if (extractionStrategy === 'NATIVE_TEXT') {
      const nextSelections: Selection[] = inferred.map((cell) => ({
        ...cell.rect,
        id: crypto.randomUUID(),
        weekday: cell.weekday,
        ordinal: cell.ordinal,
        classLabel: cell.classLabel,
      }))
      setSelections(nextSelections)
      const incomplete = nextSelections.filter((item) => !item.weekday || !isValidOrdinal(item.ordinal) || !item.classLabel)
      setNeedsManualContext(incomplete.length > 0)

      const first = matches[0]
      const viewport = viewportRef.current
      const canvas = canvasRef.current
      if (viewport && canvas && canvas.height > 0) {
        const scaleY = canvas.clientHeight / canvas.height
        viewport.scrollTo({ top: Math.max(0, first.rect.y * scaleY - 80), behavior: 'smooth' })
      }
      setMessage(incomplete.length
        ? `Ho trovato ${nextSelections.length} lezioni candidate; ${incomplete.length} richiedono un controllo dei dettagli.`
        : `Ho ricostruito automaticamente ${nextSelections.length} lezioni: controlla il riepilogo e continua.`)
      return
    }

    const visualRegions = pageRegionsRef.current.filter((region) => region.kind !== 'TEXT_BEARING')
    const source = canvasRef.current
    if (extractionStrategy !== 'VISUAL_PAGE' || !source || !sourceFingerprint || !visualRegions.length || !effectiveFrom) {
      setSelections([])
      setNeedsManualContext(true)
      setMessage('Non riesco a ricostruire automaticamente l’orario da questo documento. Puoi usare la correzione manuale.')
      return
    }

    setSelections([])
    setTouchSelectMode(false)
    setKeyboardCursor(null)
    setKeyboardStart(null)
    startRef.current = null
    setBusy(true)
    setNeedsManualContext(false)
    setMessage('Sto leggendo l’orario…')
    let localDiagnostic = ''

    try {
      const localItems = []
      const localOcrDeadlineAt = Date.now() + LOCAL_OCR_TIMEOUT_MS
      for (const [regionIndex, region] of visualRegions.entries()) {
        const timeoutMs = remainingLocalOcrBudgetMs(localOcrDeadlineAt)
        if (timeoutMs <= 0) throw new LocalDocumentOcrTimeoutError(LOCAL_OCR_TIMEOUT_MS)
        const localPage = copyPageRegionForLocalOcr(source, region)
        try {
          localItems.push(...await recognizeLocalDocumentImage({
            image: localPage.canvas,
            page: region.page,
            offset: { x: region.x, y: region.y },
            coordinateScale: localPage.coordinateScale,
            timeoutMs,
            onProgress: ({ progress }) => {
              setMessage(localOcrProgressLabel({
                progress,
                rasterIndex: regionIndex,
                rasterTotal: visualRegions.length,
              }))
            },
          }))
        } finally {
          localPage.canvas.width = 1
          localPage.canvas.height = 1
        }
      }

      const localAnchors: SearchAnchor[] = localItems.flatMap((item) => {
        const rect = rectFromPolygon(item.polygon)
        return rect ? [{ text: item.text, page: item.page, rect }] : []
      })
      const localMatches = findTeacherTextAnchors(localAnchors, label)
      const localInferred = inferTeacherTimetableCells(localAnchors, label)
      const completeRows = localInferred.filter(
        (cell): cell is typeof cell & { weekday: number; ordinal: number; classLabel: string } =>
          cell.weekday !== null && isValidOrdinal(cell.ordinal) && Boolean(cell.classLabel),
      )

      const incompleteRows = localInferred.length - completeRows.length
      localDiagnostic = `Lettura locale: ${localItems.length} parole · ${localMatches.length} occorrenze di “${label}” · ${completeRows.length} lezioni complete${incompleteRows > 0 ? ` · ${incompleteRows} incomplete` : ''}.`
      setMessage(localDiagnostic)

      if (
        localMatches.length > 0
        && completeRows.length > 0
        && completeRows.length === localInferred.length
      ) {
        setTeacherMatches(localMatches)
        const data = new FormData()
        data.set('teacherLabel', label)
        data.set('effectiveFrom', effectiveFrom)
        data.set('sourceFingerprint', sourceFingerprint)
        data.set('rows', JSON.stringify(completeRows.map((cell) => ({
          day: cell.weekday,
          ordinal: cell.ordinal,
          classLabel: cell.classLabel,
          confidence: 0.8,
          evidenceRef: `local-ocr:p${cell.page}`,
        }))))
        if (replaceReviewedCandidate) data.set('replaceReviewedCandidate', 'yes')

        const localResult = await persistLocallyExtractedTimetableImport(data)
        if (localResult?.ok) {
          setAcceptedCandidateId(localResult.candidateId)
          onCandidateAccepted?.(localResult.candidateId)
          setMessage(`Ho ricostruito localmente ${completeRows.length} lezioni. Apro il controllo…`)
          try {
            await onBeforeSubmit()
          } catch (cleanupError) {
            console.error('Timetable local OCR staging cleanup failed after candidate acceptance', cleanupError)
            setBusy(false)
            setMessage('La proposta è pronta, ma il PDF locale non è ancora stato rimosso. Riprova la rimozione prima di aprire la revisione.')
            return
          }
          window.location.assign(reviewUrl(localResult.candidateId))
          return
        }

        const localCode = localResult?.code ?? 'persist_failed'
        if (localCode !== 'parse_failed' && localCode !== 'no_rows') {
          setBusy(false)
          if (isRecoverableImportFailure(localCode)) {
            setMessage(messageForImportFailure(localCode))
            return
          }
          try {
            await onBeforeSubmit()
          } catch (cleanupError) {
            console.error('Timetable local OCR staging cleanup failed after terminal result', cleanupError)
            setMessage(`${messageForImportFailure(localCode)} La rimozione del PDF locale non è riuscita: usa Annulla acquisizione e riprova.`)
            return
          }
          setMessage(messageForImportFailure(localCode))
          return
        }
      }
    } catch (localError) {
      const message = localError instanceof Error ? localError.message : 'local OCR unavailable'
      console.warn('Timetable local OCR did not complete:', message.slice(0, 240))
      localDiagnostic = localError instanceof LocalDocumentOcrTimeoutError
        ? `Lettura locale interrotta dopo ${Math.round(LOCAL_OCR_TIMEOUT_MS / 1000)} secondi.`
        : `Lettura locale non riuscita: ${message.slice(0, 160)}`
      setMessage(localDiagnostic)
    }

    // Preserve the local-device evidence while the governed remote fallback is attempted.
    setMessage(`${localDiagnostic || 'La lettura locale non ha prodotto una diagnosi.'} Provo il servizio di estrazione configurato…`)
    try {
      const rasterDerivative = await cropPageRegions(source, visualRegions)
      const safeFile = new File([rasterDerivative], 'orario-pagine-immagine.jpg', {
        type: rasterDerivative.type || 'image/jpeg',
        lastModified: Date.now(),
      })
      const data = new FormData()
      data.set('file', safeFile)
      data.set('teacherLabel', label)
      data.set('effectiveFrom', effectiveFrom)
      data.set('originalSourceFingerprint', sourceFingerprint)
      data.set('sourceMode', sourceMode)
      if (replaceReviewedCandidate) data.set('replaceReviewedCandidate', 'yes')

      const result = await analyzeRasterTimetableImport(data)
      if (!result || !result.ok) {
        const code = result?.code ?? 'persist_failed'
        setBusy(false)
        if (isRecoverableImportFailure(code)) {
          setNeedsManualContext(true)
          setMessage(code === 'extractor_unavailable'
            ? `${localDiagnostic || 'Lettura locale senza diagnosi.'} Il servizio remoto non è disponibile. La selezione manuale resta un fallback secondario.`
            : code === 'parse_failed' || code === 'no_rows'
              ? `${localDiagnostic || 'Lettura locale senza diagnosi.'} Il servizio remoto non ha ricostruito l’orario con sicurezza. La selezione manuale resta un fallback secondario.`
              : `${localDiagnostic ? `${localDiagnostic} ` : ''}${messageForImportFailure(code)}`)
          return
        }
        try {
          await onBeforeSubmit()
        } catch (cleanupError) {
          console.error('Timetable raster staging cleanup failed after terminal server result', cleanupError)
          setMessage(`${messageForImportFailure(code)} La rimozione del PDF locale non è riuscita: usa Annulla acquisizione e riprova.`)
          return
        }
        setMessage(messageForImportFailure(code))
        return
      }

      setAcceptedCandidateId(result.candidateId)
      onCandidateAccepted?.(result.candidateId)
      setMessage('Ho ricostruito l’orario. Apro il controllo delle lezioni trovate…')
      try {
        await onBeforeSubmit()
      } catch (cleanupError) {
        console.error('Timetable raster staging cleanup failed after candidate acceptance', cleanupError)
        setBusy(false)
        setMessage('La proposta è pronta, ma il PDF locale non è ancora stato rimosso. Riprova la rimozione prima di aprire la revisione.')
        return
      }
      window.location.assign(reviewUrl(result.candidateId))
    } catch (error) {
      console.error('Timetable raster intake failed', error)
      setBusy(false)
      setNeedsManualContext(true)
      setMessage('Non riesco ancora a ricostruire automaticamente l’orario. Puoi usare la correzione manuale.')
    }
  }

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
      classLabel: null,
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
    const missingManualContext = needsManualContext && selections.some((item) => !item.weekday || !isValidOrdinal(item.ordinal) || !item.classLabel)
    if (!source || !sourceFingerprint || !selections.length || missingManualContext || !teacherLabel.trim() || !effectiveFrom || busy || acceptedCandidateId) return
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
      data.set('sourceMode', sourceMode)
      if (replaceReviewedCandidate) data.set('replaceReviewedCandidate', 'yes')

      const result = await analyzeMinimizedTimetableImport(data)

      if (!result || !result.ok) {
        const code = result?.code ?? 'persist_failed'
        if (isRecoverableImportFailure(code)) {
          if ((code === 'parse_failed' || code === 'no_rows') && !needsManualContext) {
            setNeedsManualContext(true)
            setBusy(false)
            setMessage('Non riesco a ricavare con sicurezza giorno e ora dalle sole aree scelte. Completa questi dettagli e riprova: è il percorso di correzione, non quello principale.')
            return
          }
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

  function updateSelection(id: string, patch: Partial<Pick<Selection, 'weekday' | 'ordinal' | 'classLabel'>>) {
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
        <strong>Trova il tuo nome, controlla le celle, conferma</strong>
        <p style={{ margin: '4px 0 0' }}>
          Il PDF resta sul dispositivo. Inserisci il nominativo: Docente OS ricostruisce automaticamente il tuo orario settimanale e ti chiede solo di controllarlo.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <label>
          <span>Cognome o etichetta con cui compari nell’orario</span>
          <input value={teacherLabel} onChange={(event) => { setTeacherLabel(event.currentTarget.value); setTeacherMatches([]) }} maxLength={120} autoComplete="off" placeholder="Es. ROSSI" />
        </label>
        <button type="button" onClick={() => void findTeacher()} disabled={!ready || !teacherLabel.trim() || busy} aria-busy={busy}>
          {busy ? 'Sto leggendo l’orario…' : 'Estrai il mio orario'}
        </button>
        <small>Docente OS prova prima la lettura locale. Se il PDF è un’immagine, usa automaticamente la pagina renderizzata per ricostruire l’orario.</small>
      </div>

      <p role="status" aria-live="polite" style={{ margin: 0 }}>{message}</p>

      <div ref={viewportRef} style={{ maxHeight: 360, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <canvas
            ref={canvasRef}
            role={needsManualContext ? 'application' : 'img'}
            tabIndex={needsManualContext ? 0 : -1}
            onPointerDown={needsManualContext ? pointerDown : undefined}
            onPointerUp={needsManualContext ? pointerUp : undefined}
            onPointerCancel={needsManualContext ? () => { startRef.current = null } : undefined}
            onKeyDown={needsManualContext ? keyboardSelection : undefined}
            aria-label={needsManualContext
              ? 'Anteprima locale dell’orario: trascina oppure usa tastiera per selezionare le tue celle'
              : 'Anteprima locale dell’orario'}
            aria-describedby={needsManualContext ? 'timetable-selection-help' : undefined}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              touchAction: needsManualContext && touchSelectMode ? 'none' : 'pan-y',
              cursor: needsManualContext && ready && !busy ? 'crosshair' : 'default',
            }}
          />
          {canvasRef.current?.width && canvasRef.current?.height ? (
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {teacherMatches.map((match, index) => (
                <span key={`teacher-match-${index}`} style={{
                  position: 'absolute',
                  left: `${match.rect.x / canvasRef.current!.width * 100}%`,
                  top: `${match.rect.y / canvasRef.current!.height * 100}%`,
                  width: `${match.rect.width / canvasRef.current!.width * 100}%`,
                  height: `${match.rect.height / canvasRef.current!.height * 100}%`,
                  outline: '3px solid currentColor',
                  outlineOffset: 2,
                  boxSizing: 'border-box',
                }} />
              ))}
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
        {busy
          ? 'Analisi automatica in corso…'
          : pages
            ? (needsManualContext || selections.length > 0
              ? `${pages} pagina${pages === 1 ? '' : 'e'} · ${selections.length} ${selections.length === 1 ? 'area selezionata' : 'aree selezionate'}`
              : `${pages} pagina${pages === 1 ? '' : 'e'} pronta`)
            : 'Preparazione in corso…'}
        {needsManualContext ? <span className="timetableKeyboardHelp"> Da tastiera: usa le frecce, Invio per iniziare/chiudere l’area e Maiusc + frecce per spostarti più velocemente.</span> : null}
      </small>

      {needsManualContext ? <button
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
        {touchSelectMode ? 'Torna a scorrere' : 'Selezione manuale (fallback)'}
      </button> : null}

      {selections.length ? (
        <div className="knowledgeFeedback" style={{ display: 'grid', gap: 8 }}>
          <strong>{selections.length === 1 ? '1 lezione trovata' : `${selections.length} lezioni trovate`}</strong>
          <div style={{ display: 'grid', gap: 4 }}>
            {selections.map((selection, index) => (
              <span key={selection.id}>
                {index + 1}. {WEEKDAYS.find((day) => day.value === selection.weekday)?.label ?? 'Giorno da verificare'} · {selection.ordinal ? `${selection.ordinal}ª ora` : 'ora da verificare'} · {selection.classLabel ?? 'classe da verificare'}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {needsManualContext && selections.length ? (
        <details open>
          <summary><strong>Correzione avanzata · completa i dettagli ambigui</strong></summary>
          <p>Questi campi compaiono solo quando il documento non consente una ricostruzione automatica affidabile.</p>
          <div style={{ display: 'grid', gap: 8 }} aria-label="Contesto avanzato delle aree selezionate">
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
                <label>
                  <span>Classe</span>
                  <input
                    value={selection.classLabel ?? ''}
                    onChange={(event) => updateSelection(selection.id, { classLabel: event.currentTarget.value.trim() || null })}
                    placeholder="Es. 2C"
                  />
                </label>
                <button type="button" onClick={() => setSelections((current) => current.filter((item) => item.id !== selection.id))} disabled={busy}>
                  Rimuovi area
                </button>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {(selections.length > 0 || acceptedCandidateId) ? (
        <div className="timetablePrimaryActions">
          {selections.length > 0 ? (
            <button type="button" onClick={() => void submit()} disabled={!ready || !sourceFingerprint || (needsManualContext && selections.some((item) => !item.weekday || !isValidOrdinal(item.ordinal) || !item.classLabel)) || !teacherLabel.trim() || !effectiveFrom || busy || Boolean(acceptedCandidateId)}>
              {busy ? 'Preparo la proposta…' : 'Continua'}
            </button>
          ) : null}
          {acceptedCandidateId ? (
            <button type="button" onClick={() => void retryAcceptedCleanup()} disabled={busy}>
              Apri la revisione
            </button>
          ) : null}
        </div>
      ) : null}

      <details className="timetableSecondaryOptions">
        <summary>Altre opzioni</summary>
        <div style={{ display: 'grid', gap: 10, paddingTop: 10 }}>
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
            <span>Sostituisci una proposta precedente già corretta manualmente.</span>
          </label>
          <button type="button" onClick={() => { setSelections([]); setMessage('Selezione cancellata. Il PDF resta soltanto sul dispositivo.') }} disabled={!selections.length || busy}>
            Cancella selezione
          </button>
        </div>
      </details>

      <details className="timetableSecondaryOptions">
        <summary>Privacy e file locale</summary>
        <p className="knowledgeUploadTrust" style={{ margin: '8px 0 0' }}>
          Il PDF completo non viene caricato in Conoscenza e non viene conservato come fonte. Le pagine immagine vengono lette prima localmente sul dispositivo; al server arrivano soltanto le righe strutturate necessarie a preparare la proposta. Solo se la lettura locale non basta, Docente OS può usare il servizio di estrazione configurato inviando le sole pagine renderizzate necessarie, mai il PDF originale. La proposta resta modificabile e richiede conferma prima di cambiare la bozza dell’Orario.
        </p>
      </details>
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
      classLabel: rect.classLabel,
    }))
    .filter((rect) => rect.width > 0 && rect.height > 0)

  const labelHeight = 44
  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')
  if (!measureCtx) throw new Error('Canvas di misura non disponibile')
  measureCtx.font = '600 22px sans-serif'
  const labelWidth = Math.ceil(Math.max(...normalized.map((rect) =>
    measureCtx.measureText(derivativeContextLabel(teacherLabel, rect.weekday, rect.ordinal, rect.classLabel)).width
  ))) + 16
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
    ctx.fillText(derivativeContextLabel(teacherLabel, rect.weekday, rect.ordinal, rect.classLabel), 8, y + labelHeight / 2)
    y += labelHeight
    ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, y, rect.width, rect.height)
    y += rect.height + padding
  }

  const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Impossibile creare il derivato locale')
  return blob
}

function copyPageRegionForLocalOcr(source: HTMLCanvasElement, region: PageRegion) {
  const normalized = clampRectToBounds(region, source.width, source.height)
  if (normalized.width <= 0 || normalized.height <= 0) {
    throw new Error('Pagina immagine non disponibile per la lettura locale')
  }
  const dimensions = localOcrDimensions(normalized.width, normalized.height)
  const output = document.createElement('canvas')
  output.width = dimensions.width
  output.height = dimensions.height
  const ctx = output.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Canvas OCR locale non disponibile')
  ctx.fillStyle = canvasSurfaceColor()
  ctx.fillRect(0, 0, output.width, output.height)
  ctx.drawImage(
    source,
    normalized.x,
    normalized.y,
    normalized.width,
    normalized.height,
    0,
    0,
    output.width,
    output.height,
  )
  return { canvas: output, coordinateScale: dimensions.coordinateScale }
}

async function cropPageRegions(source: HTMLCanvasElement, regions: PageRegion[]) {
  const normalized = regions
    .map((region) => ({ ...region, ...clampRectToBounds(region, source.width, source.height) }))
    .filter((region) => region.width > 0 && region.height > 0)
  if (!normalized.length) throw new Error('Nessuna pagina immagine disponibile')

  const gap = 16
  const rawWidth = Math.max(...normalized.map((region) => region.width))
  const rawHeight = normalized.reduce((sum, region) => sum + region.height, 0) + gap * Math.max(0, normalized.length - 1)
  const edgeScale = Math.min(1, MAX_RASTER_DERIVATIVE_EDGE / rawWidth)
  const pixelScale = Math.min(1, Math.sqrt(MAX_RASTER_DERIVATIVE_PIXELS / Math.max(1, rawWidth * rawHeight)))
  const scale = Math.min(edgeScale, pixelScale)
  const width = Math.max(1, Math.round(rawWidth * scale))
  const height = Math.max(1, Math.round(rawHeight * scale))

  const output = document.createElement('canvas')
  output.width = width
  output.height = height
  const ctx = output.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Canvas di derivazione raster non disponibile')
  ctx.fillStyle = canvasSurfaceColor()
  ctx.fillRect(0, 0, width, height)

  let y = 0
  for (const region of normalized) {
    const targetWidth = Math.max(1, Math.round(region.width * scale))
    const targetHeight = Math.max(1, Math.round(region.height * scale))
    ctx.drawImage(
      source,
      region.x,
      region.y,
      region.width,
      region.height,
      0,
      Math.round(y * scale),
      targetWidth,
      targetHeight,
    )
    y += region.height + gap
  }

  for (const quality of [0.82, 0.72, 0.62, 0.52]) {
    const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, 'image/jpeg', quality))
    if (blob && blob.size <= MAX_RASTER_DERIVATIVE_BYTES) return blob
  }

  throw new Error('Il derivato raster resta troppo grande dopo la compressione locale')
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
    || code === 'extractor_unavailable'
    || code === 'parse_failed'
    || code === 'no_rows'
    || code === 'replace_confirmation_required'
    || code === 'persist_failed'
}

function reviewUrl(candidateId: string) {
  return `/orario/aggiorna?importCandidate=${encodeURIComponent(candidateId)}&import=review`
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
