'use client'

import { useEffect, useRef, useState } from 'react'
import { getDocumentProxy } from 'unpdf'
import { analyzeSharedTimetableImport } from '@/app/orario/actions'
import { MAX_KNOWLEDGE_UPLOAD_BYTES } from '@/app/knowledge/upload-policy'
import { dateFromFilename } from './timetable-share-helpers'

type Props = {
  file: File
  onBeforeSubmit: () => Promise<void> | void
  onCandidateAccepted?: (candidateId: string) => void
}

const MAX_PAGES = 5
const MAX_PREVIEW_DIMENSION = 1400

export function TimetableSharedIntake({ file, onBeforeSubmit, onCandidateAccepted }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [teacherLabel, setTeacherLabel] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(() => dateFromFilename(file.name) ?? '')
  const [replaceReviewedCandidate, setReplaceReviewedCandidate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [acceptedCandidateId, setAcceptedCandidateId] = useState<string | null>(null)
  const [message, setMessage] = useState('Preparo l’anteprima del documento…')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) throw new Error('Per ora il riconoscimento automatico dell’orario è disponibile per i PDF.')
        if (file.size > MAX_KNOWLEDGE_UPLOAD_BYTES) throw new Error(`Il PDF supera il limite di ${Math.round(MAX_KNOWLEDGE_UPLOAD_BYTES / 1024 / 1024)} MB.`)
        const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()))
        if (pdf.numPages < 1 || pdf.numPages > MAX_PAGES) throw new Error(`Il PDF ha ${pdf.numPages} pagine: questo flusso supporta fino a ${MAX_PAGES} pagine.`)
        const page = await pdf.getPage(1)
        const base = page.getViewport({ scale: 1 })
        const scale = Math.min(2, MAX_PREVIEW_DIMENSION / Math.max(base.width, base.height))
        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current
        if (!canvas) throw new Error('Anteprima non disponibile')
        canvas.width = Math.max(1, Math.round(viewport.width))
        canvas.height = Math.max(1, Math.round(viewport.height))
        const context = canvas.getContext('2d', { alpha: false })
        if (!context) throw new Error('Anteprima non disponibile')
        await page.render({ canvas, canvasContext: context, viewport }).promise
        if (cancelled) return
        setReady(true)
        setMessage('Documento pronto. Inserisci il cognome con cui compari nell’orario.')
      } catch (error) {
        if (cancelled) return
        setReady(false)
        setMessage(error instanceof Error ? error.message : 'Non riesco a preparare questo PDF.')
      }
    })()
    return () => { cancelled = true }
  }, [file])

  async function extractTimetable() {
    const teacher = teacherLabel.trim()
    if (!ready || !teacher || !effectiveFrom || busy || acceptedCandidateId) return
    setBusy(true)
    setMessage(`Cerco “${teacher}” nel documento e ricostruisco giorno, ora e classe…`)
    try {
      const data = new FormData()
      data.set('file', file)
      data.set('teacherLabel', teacher)
      data.set('effectiveFrom', effectiveFrom)
      data.set('sourceMode', 'LOCAL_SHARED_DOCUMENT')
      if (replaceReviewedCandidate) data.set('replaceReviewedCandidate', 'yes')
      const result = await analyzeSharedTimetableImport(data)
      if (!result.ok) {
        setBusy(false)
        setMessage(messageForImportFailure(result.code))
        return
      }
      setAcceptedCandidateId(result.candidateId)
      onCandidateAccepted?.(result.candidateId)
      setMessage('Orario riconosciuto. Apro il riepilogo per il controllo finale…')
      try {
        await onBeforeSubmit()
      } catch (cleanupError) {
        console.error('Timetable local staging cleanup failed after candidate acceptance', cleanupError)
        setBusy(false)
        setMessage('L’orario è stato riconosciuto, ma il PDF locale non è ancora stato rimosso. Usa “Apri la revisione” dopo aver riprovato la rimozione.')
        return
      }
      window.location.assign(reviewUrl(result.candidateId))
    } catch (error) {
      console.error('Timetable shared document extraction failed', error)
      setBusy(false)
      setMessage('Non sono riuscito a leggere l’orario. Il PDF resta sul dispositivo e puoi riprovare senza ricaricarlo.')
    }
  }

  async function retryAcceptedCleanup() {
    if (!acceptedCandidateId || busy) return
    setBusy(true)
    try {
      await onBeforeSubmit()
      window.location.assign(reviewUrl(acceptedCandidateId))
    } catch {
      setBusy(false)
      setMessage('Il PDF locale non è ancora stato rimosso. Riprova prima di uscire.')
    }
  }

  return (
    <section aria-label="Riconoscimento automatico dell’orario" style={{ display: 'grid', gap: 14 }}>
      <div className="knowledgeFeedback" role="status" aria-live="polite">
        <strong>{busy ? 'Sto leggendo il tuo orario…' : ready ? 'Orario ricevuto ✓' : 'Preparo il documento…'}</strong>
        <p style={{ margin: '4px 0 0' }}>{message}</p>
      </div>

      <div style={{ maxHeight: 260, overflow: 'hidden', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)' }}>
        <canvas ref={canvasRef} aria-label="Anteprima del documento condiviso" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      <label>
        <span>Come compari nell’orario?</span>
        <input value={teacherLabel} onChange={(event) => setTeacherLabel(event.currentTarget.value)} maxLength={120} autoComplete="off" placeholder="Es. CORSANO" disabled={busy || Boolean(acceptedCandidateId)} />
      </label>

      <div className="timetablePrimaryActions">
        <button type="button" onClick={() => void extractTimetable()} disabled={!ready || !teacherLabel.trim() || !effectiveFrom || busy || Boolean(acceptedCandidateId)}>
          {busy ? 'Sto ricostruendo l’orario…' : 'Trova il mio orario'}
        </button>
        {acceptedCandidateId ? <button type="button" onClick={() => void retryAcceptedCleanup()} disabled={busy}>Apri la revisione</button> : null}
      </div>

      <details className="timetableSecondaryOptions">
        <summary>Altre opzioni</summary>
        <div style={{ display: 'grid', gap: 10, paddingTop: 10 }}>
          <label><span>Orario valido dal</span><input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.currentTarget.value)} /></label>
          <label>
            <input type="checkbox" checked={replaceReviewedCandidate} onChange={(event) => setReplaceReviewedCandidate(event.currentTarget.checked)} />
            <span>Sostituisci una proposta precedente già corretta manualmente.</span>
          </label>
        </div>
      </details>

      <details className="timetableSecondaryOptions">
        <summary>Privacy e file locale</summary>
        <p className="knowledgeUploadTrust" style={{ margin: '8px 0 0' }}>
          Il PDF viene inviato solo quando scegli “Trova il mio orario”, esclusivamente per riconoscere le celle del docente indicato.
          Non viene conservato come fonte in Conoscenza. La proposta resta modificabile e non cambia l’orario in uso senza la tua conferma.
        </p>
      </details>
    </section>
  )
}

function reviewUrl(candidateId: string) {
  return `/orario?importCandidate=${encodeURIComponent(candidateId)}&import=review`
}

function messageForImportFailure(code: string) {
  if (code === 'invalid_date') return 'La data di validità non rientra nell’anno scolastico corrente. Correggila in “Altre opzioni” e riprova.'
  if (code === 'teacher_required') return 'Inserisci il cognome o l’etichetta con cui compari nell’orario.'
  if (code === 'parse_failed' || code === 'no_rows') return 'Non sono riuscito a riconoscere con sufficiente affidabilità lezioni attribuite a questo nominativo. Il PDF resta disponibile sul dispositivo.'
  if (code === 'replace_confirmation_required') return 'Esiste già una proposta corretta manualmente. Per sostituirla usa l’opzione esplicita in “Altre opzioni”.'
  if (code === 'already_applied') return 'Questo documento risulta già applicato alla bozza dell’orario.'
  if (code === 'invalid_content' || code === 'unsupported' || code === 'too_large') return 'Il documento non supera i controlli di acquisizione. Usa il PDF originale o un file supportato.'
  return 'Non sono riuscito a preparare la proposta. Il PDF resta sul dispositivo e puoi riprovare.'
}
