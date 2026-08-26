'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

type Point = { x: number; y: number }

export function LocalImagePrivacyWorkbench({
  file,
  disabled,
  onPrepared,
}: {
  file: File
  disabled: boolean
  onPrepared: (file: File | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sourceBitmapRef = useRef<ImageBitmap | null>(null)
  const dragStartRef = useRef<Point | null>(null)
  const onPreparedRef = useRef(onPrepared)
  const [ready, setReady] = useState(false)
  const [reviewConfirmed, setReviewConfirmed] = useState(false)
  const [redactionCount, setRedactionCount] = useState(0)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    onPreparedRef.current = onPrepared
  }, [onPrepared])

  useEffect(() => {
    let cancelled = false
    onPreparedRef.current(null)
    setReady(false)
    setReviewConfirmed(false)
    setRedactionCount(0)
    setMessage(null)

    void (async () => {
      try {
        const bitmap = await createImageBitmap(file)
        if (cancelled) {
          bitmap.close()
          return
        }
        sourceBitmapRef.current?.close()
        sourceBitmapRef.current = bitmap
        drawSource(bitmap)
        setReady(true)
      } catch (error) {
        console.error('Local image privacy workbench decode failed', error)
        setMessage('Non riesco ad aprire questa immagine localmente. Nessun byte è stato inviato: scegli un altro file.')
      }
    })()

    return () => {
      cancelled = true
      sourceBitmapRef.current?.close()
      sourceBitmapRef.current = null
    }
  }, [file])

  function drawSource(bitmap: ImageBitmap) {
    const canvas = canvasRef.current
    if (!canvas) return
    const maxDimension = 2200
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) return
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  }

  function resetImage() {
    const bitmap = sourceBitmapRef.current
    if (!bitmap || disabled) return
    drawSource(bitmap)
    setRedactionCount(0)
    setReviewConfirmed(false)
    onPreparedRef.current(null)
    setMessage('Copia locale ripristinata. Ricontrolla tutta l’immagine prima di prepararla.')
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
    setMessage('Area oscurata solo nella copia locale. Controlla che non restino dettagli identificativi.')
  }

  async function prepareSafeCopy() {
    const canvas = canvasRef.current
    if (!canvas || !ready || !reviewConfirmed || disabled) return
    setMessage('Sto creando localmente una copia PNG senza i metadata dell’originale…')

    const blob = await canvasToPng(canvas)
    if (!blob) {
      setMessage('Non sono riuscito a creare la copia locale. L’originale non è stato inviato.')
      onPreparedRef.current(null)
      return
    }

    const safeFile = new File([blob], 'immagine-anonima.png', { type: 'image/png', lastModified: Date.now() })
    onPreparedRef.current(safeFile)
    setMessage('Copia anonima pronta: verrà inviato solo questo PNG ricodificato, non l’originale selezionato.')
  }

  return (
    <section aria-label="Revisione privacy locale dell’immagine" style={{ border: '1px solid var(--border, #d7d7d7)', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
      <div>
        <strong>Revisione locale prima del caricamento</strong>
        <p style={{ margin: '4px 0 0' }}>L’immagine resta nel browser. Trascina sull’anteprima per oscurare nomi, volti, recapiti o altri dettagli personali. Nessun originale viene inviato.</p>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { dragStartRef.current = null }}
        style={{ width: '100%', maxHeight: 520, objectFit: 'contain', borderRadius: 8, background: '#f4f4f4', touchAction: 'none', cursor: ready && !disabled ? 'crosshair' : 'default' }}
        aria-label="Anteprima locale: trascina per oscurare un’area"
      />

      <small>{redactionCount ? `${redactionCount} area${redactionCount === 1 ? '' : 'e'} oscurata${redactionCount === 1 ? '' : 'e'} nella copia locale.` : 'Se l’immagine è già priva di dati personali, puoi limitarti alla revisione completa.'}</small>

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
        Ho controllato tutta l’immagine e nella copia visibile non restano dati personali di studenti o terzi.
      </label>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" onClick={() => void prepareSafeCopy()} disabled={!ready || !reviewConfirmed || disabled}>Prepara copia anonima</button>
        <button type="button" onClick={resetImage} disabled={!ready || disabled}>Ripristina copia locale</button>
      </div>

      {message ? <p role="status" aria-live="polite" style={{ margin: 0 }}>{message}</p> : null}
    </section>
  )
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
}
