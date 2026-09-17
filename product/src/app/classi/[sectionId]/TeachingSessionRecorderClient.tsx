'use client'

import { useMemo, useRef, useState } from 'react'
import type { LessonReflectionCaptureActionResult } from '@/core/application/copilot/lesson-reflection-handler'
import type { ContextualCaptureProposalKind } from '@/core/presentation/contextual-capture'
import {
  buildLessonReflectionCapturePrompt,
  CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH,
} from '@/core/presentation/contextual-capture-frontdoor'
import { recordTeachingSession } from './actions'
import LessonVoiceCapture from './lezioni/[blockId]/lesson-voice-capture'
import lessonStyles from './lezioni/[blockId]/lesson-live.module.css'

export type TeachingSessionRecorderProps = {
  sectionId: string
  localDate: string
  occurrenceLogicalId: string | null
  plannedMinutes: number | null
  allowDateSelection?: boolean
  maxLocalDate?: string
  blocks: Array<{
    id: string
    title: string
    allocatedMinutes: number
    plannedMinutes: number
  }>
}

export function TeachingSessionRecorderClient({
  sectionId,
  localDate,
  occurrenceLogicalId,
  plannedMinutes,
  allowDateSelection = false,
  maxLocalDate,
  blocks,
  voiceCaptureEnabled,
}: TeachingSessionRecorderProps & { voiceCaptureEnabled: boolean }) {
  const suggestedActual = plannedMinutes ?? 60
  const [recordLocalDate, setRecordLocalDate] = useState(localDate)
  const [actualMinutes, setActualMinutes] = useState(suggestedActual)
  const [blockId1, setBlockId1] = useState(blocks[0]?.id ?? '')
  const [minutes1, setMinutes1] = useState(suggestedActual)
  const [blockId2, setBlockId2] = useState('')
  const [minutes2, setMinutes2] = useState(0)
  const [evidenceNote, setEvidenceNote] = useState('')
  const [capturePreview, setCapturePreview] = useState<LessonReflectionCaptureActionResult | null>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [organizing, setOrganizing] = useState(false)
  const [voiceBusy, setVoiceBusy] = useState(false)
  const captureGenerationRef = useRef(0)

  const editableDate = allowDateSelection && !occurrenceLogicalId
  const total = minutes1 + (blockId2 ? minutes2 : 0)
  const invalid = total > actualMinutes || !blockId1 || minutes1 <= 0 || !recordLocalDate || (blockId2 ? minutes2 <= 0 || blockId2 === blockId1 : false)
  const lessonSurfacePath = blockId1
    ? `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(blockId1)}?mode=record`
    : null
  const effect = useMemo(() => {
    return blocks
      .filter((block) => block.id === blockId1 || block.id === blockId2)
      .map((block) => {
        const added = block.id === blockId1 ? minutes1 : minutes2
        const after = block.allocatedMinutes + added
        return {
          ...block,
          added,
          after,
          reached: after >= block.plannedMinutes,
        }
      })
  }, [blockId1, blockId2, blocks, minutes1, minutes2])

  function invalidateCapturePreview() {
    captureGenerationRef.current += 1
    setCapturePreview(null)
    setCaptureError(null)
  }

  function selectPrimaryBlock(value: string) {
    setBlockId1(value)
    invalidateCapturePreview()
  }

  function updateEvidenceNote(value: string) {
    setEvidenceNote(value)
    invalidateCapturePreview()
  }

  function appendVoiceTranscript(transcript: string) {
    setEvidenceNote((current) => {
      const existing = current.trim()
      const spoken = transcript.trim()
      if (!spoken || existing.length >= 4000) return current

      const separator = existing ? '\n' : ''
      const remaining = 4000 - existing.length
      if (remaining <= separator.length) return existing

      return `${existing}${separator}${spoken.slice(0, remaining - separator.length)}`
    })
    invalidateCapturePreview()
  }

  async function organizeEvidenceNote() {
    const note = evidenceNote.trim()
    const surfacePath = lessonSurfacePath
    if (!note || !surfacePath) {
      setCapturePreview(null)
      setCaptureError('Scrivi o detta prima una breve nota sulla lezione.')
      return
    }
    if (note.length > CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH) {
      setCapturePreview(null)
      setCaptureError(`Per organizzarla con il Copilota, riduci la nota a ${CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH} caratteri. Puoi comunque registrarla così com’è.`)
      return
    }

    const requestGeneration = captureGenerationRef.current + 1
    captureGenerationRef.current = requestGeneration
    setOrganizing(true)
    setCaptureError(null)
    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Docente-Surface-Path': surfacePath,
        },
        body: JSON.stringify({ prompt: buildLessonReflectionCapturePrompt(note) }),
      })
      const payload = await response.json().catch(() => null) as LessonReflectionCaptureActionResult | { message?: string } | null

      if (captureGenerationRef.current !== requestGeneration) return
      if (!response.ok || !payload || !('skillId' in payload) || payload.skillId !== 'LESSON_REFLECTION' || payload.status !== 'SUPPORTED') {
        const message = payload && 'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : 'Il Copilota non riesce a organizzare questa nota nel contesto corrente.'
        setCapturePreview(null)
        setCaptureError(message)
        return
      }

      setCapturePreview(payload)
    } catch {
      if (captureGenerationRef.current !== requestGeneration) return
      setCapturePreview(null)
      setCaptureError('Il Copilota non è disponibile. La nota resta qui e puoi registrare normalmente la lezione.')
    } finally {
      setOrganizing(false)
    }
  }

  return (
    <form action={recordTeachingSession} className="teachingSessionForm">
      <input type="hidden" name="sectionId" value={sectionId} />
      {editableDate ? (
        <label className="teachingSessionEvidence">
          <span>Data della lezione</span>
          <input
            name="localDate"
            type="date"
            value={recordLocalDate}
            max={maxLocalDate}
            onChange={(event) => setRecordLocalDate(event.target.value)}
            required
          />
        </label>
      ) : (
        <input type="hidden" name="localDate" value={recordLocalDate} />
      )}
      <input type="hidden" name="occurrenceLogicalId" value={occurrenceLogicalId ?? ''} />

      <div className="teachingSessionContext">
        <strong>{occurrenceLogicalId ? 'Lezione riconosciuta da Orario + Calendario' : editableDate ? 'Registrazione retroattiva manuale' : 'Registrazione manuale'}</strong>
        <span>{formatDate(recordLocalDate)}{plannedMinutes ? ` · ${plannedMinutes} min previsti` : ' · durata prevista non disponibile'}</span>
      </div>

      <div className="teachingSessionFields">
        <label>
          <span>Minuti realmente svolti</span>
          <input name="actualMinutes" type="number" min="1" max="1440" value={actualMinutes} onChange={(event) => setActualMinutes(Number(event.target.value))} required />
        </label>
        <label>
          <span>Attribuisci a</span>
          <select name="blockId1" value={blockId1} onChange={(event) => selectPrimaryBlock(event.target.value)} required>
            {blocks.map((block) => <option value={block.id} key={block.id}>{block.id} · {block.title}</option>)}
          </select>
        </label>
        <label>
          <span>Minuti su questo blocco</span>
          <input name="minutes1" type="number" min="1" max="1440" value={minutes1} onChange={(event) => setMinutes1(Number(event.target.value))} required />
        </label>
      </div>

      <details className="teachingSessionSplit">
        <summary>Ho lavorato anche su un secondo blocco</summary>
        <div className="teachingSessionFields">
          <label>
            <span>Secondo blocco</span>
            <select name="blockId2" value={blockId2} onChange={(event) => setBlockId2(event.target.value)}>
              <option value="">Nessuno</option>
              {blocks.map((block) => <option value={block.id} key={block.id}>{block.id} · {block.title}</option>)}
            </select>
          </label>
          <label>
            <span>Minuti sul secondo blocco</span>
            <input name="minutes2" type="number" min="1" max="1440" value={minutes2 || ''} onChange={(event) => setMinutes2(Number(event.target.value))} disabled={!blockId2} />
          </label>
        </div>
      </details>

      <label className="teachingSessionEvidence">
        <span>Evidenza o nota breve <small>facoltativa</small></span>
        <textarea
          name="evidenceNote"
          maxLength={4000}
          rows={3}
          value={evidenceNote}
          onChange={(event) => updateEvidenceNote(event.target.value)}
          placeholder="Es. attività completata, prodotto realizzato, adattamento effettuato…"
        />
      </label>

      {voiceCaptureEnabled && lessonSurfacePath ? (
        <LessonVoiceCapture
          surfacePath={lessonSurfacePath}
          disabled={organizing}
          onBusyChange={setVoiceBusy}
          onTranscript={appendVoiceTranscript}
        />
      ) : null}

      <div className={lessonStyles.assistantTools}>
        <button
          className={lessonStyles.assistantAction}
          type="button"
          onClick={organizeEvidenceNote}
          disabled={!evidenceNote.trim() || organizing || voiceBusy || !lessonSurfacePath}
        >
          {organizing ? 'Organizzazione…' : 'Organizza con il Copilota'}
        </button>
        <span>Il Copilota propone soltanto: nulla viene registrato finché non confermi la lezione.</span>
      </div>

      {captureError ? <p className={lessonStyles.privacyNote} role="alert">{captureError}</p> : null}

      {capturePreview ? (
        <section className={lessonStyles.assistantPreview} aria-label="Proposta del Copilota" aria-live="polite">
          <span>PROPOSTA DEL COPILOTA · NON SALVATA</span>
          <strong>Ho organizzato la nota in {capturePreview.effects.length} {capturePreview.effects.length === 1 ? 'punto' : 'punti'}.</strong>
          <ul>
            {capturePreview.effects.map((item) => (
              <li key={`${item.kind}:${item.summary}`}>
                <b>{captureLabel(item.kind)}</b>
                <p>{item.summary}</p>
              </li>
            ))}
          </ul>
          {capturePreview.nextActivity ? (
            <div className={lessonStyles.assistantSuggestion}>
              <span>PROSSIMA ATTIVITÀ PROPOSTA</span>
              <p>{capturePreview.nextActivity}</p>
            </div>
          ) : null}
          <p className={lessonStyles.privacyNote}>La proposta resta locale alla schermata. La registrazione avviene solo con “Registra ciò che ho svolto”.</p>
        </section>
      ) : null}

      <div className={`teachingSessionEffect ${invalid ? 'invalid' : ''}`} aria-live="polite">
        <strong>Effetto prima di registrare</strong>
        {effect.map((item) => (
          <span key={item.id}>{item.id}: {item.allocatedMinutes} + {item.added} = <b>{item.after}/{item.plannedMinutes} min</b>{item.reached ? ' · soglia quantitativa raggiunta, ma non sarà segnato automaticamente come svolto' : ''}</span>
        ))}
        <small>{total}/{actualMinutes} minuti allocati. {actualMinutes - total >= 0 ? `${actualMinutes - total} min restano non attribuiti.` : 'Hai attribuito più minuti di quelli realmente svolti.'}</small>
      </div>

      <button type="submit" disabled={invalid || organizing || voiceBusy}>Registra ciò che ho svolto</button>
    </form>
  )
}

function captureLabel(kind: ContextualCaptureProposalKind) {
  if (kind === 'LESSON_EXECUTION_NOTE') return 'Ciò che è stato svolto'
  if (kind === 'PROFESSIONAL_OBSERVATION') return 'Osservazione professionale'
  if (kind === 'NEXT_LESSON_FOCUS') return 'Da riprendere'
  if (kind === 'PREPARATION_NEED') return 'Da preparare'
  return 'Promemoria'
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)))
}
