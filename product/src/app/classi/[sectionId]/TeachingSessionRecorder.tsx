'use client'

import { useMemo, useState } from 'react'
import { recordTeachingSession } from './actions'

type BlockOption = {
  id: string
  title: string
  allocatedMinutes: number
  plannedMinutes: number
}

export function TeachingSessionRecorder({
  sectionId,
  localDate,
  occurrenceLogicalId,
  plannedMinutes,
  blocks,
}: {
  sectionId: string
  localDate: string
  occurrenceLogicalId: string | null
  plannedMinutes: number | null
  blocks: BlockOption[]
}) {
  const suggestedActual = plannedMinutes ?? 60
  const [actualMinutes, setActualMinutes] = useState(suggestedActual)
  const [blockId1, setBlockId1] = useState(blocks[0]?.id ?? '')
  const [minutes1, setMinutes1] = useState(suggestedActual)
  const [blockId2, setBlockId2] = useState('')
  const [minutes2, setMinutes2] = useState(0)

  const total = minutes1 + (blockId2 ? minutes2 : 0)
  const invalid = total > actualMinutes || !blockId1 || minutes1 <= 0 || (blockId2 ? minutes2 <= 0 || blockId2 === blockId1 : false)
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

  return (
    <form action={recordTeachingSession} className="teachingSessionForm">
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="localDate" value={localDate} />
      <input type="hidden" name="occurrenceLogicalId" value={occurrenceLogicalId ?? ''} />

      <div className="teachingSessionContext">
        <strong>{occurrenceLogicalId ? 'Lezione riconosciuta da Orario + Calendario' : 'Registrazione manuale'}</strong>
        <span>{formatDate(localDate)}{plannedMinutes ? ` · ${plannedMinutes} min previsti` : ' · durata prevista non disponibile'}</span>
      </div>

      <div className="teachingSessionFields">
        <label>
          <span>Minuti realmente svolti</span>
          <input name="actualMinutes" type="number" min="1" max="1440" value={actualMinutes} onChange={(event) => setActualMinutes(Number(event.target.value))} required />
        </label>
        <label>
          <span>Attribuisci a</span>
          <select name="blockId1" value={blockId1} onChange={(event) => setBlockId1(event.target.value)} required>
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
        <textarea name="evidenceNote" maxLength={4000} rows={3} placeholder="Es. attività completata, prodotto realizzato, adattamento effettuato…" />
      </label>

      <div className={`teachingSessionEffect ${invalid ? 'invalid' : ''}`} aria-live="polite">
        <strong>Effetto prima di registrare</strong>
        {effect.map((item) => (
          <span key={item.id}>{item.id}: {item.allocatedMinutes} + {item.added} = <b>{item.after}/{item.plannedMinutes} min</b>{item.reached ? ' · soglia quantitativa raggiunta, ma non sarà segnato automaticamente come svolto' : ''}</span>
        ))}
        <small>{total}/{actualMinutes} minuti allocati. {actualMinutes - total >= 0 ? `${actualMinutes - total} min restano non attribuiti.` : 'Hai attribuito più minuti di quelli realmente svolti.'}</small>
      </div>

      <button type="submit" disabled={invalid}>Registra ciò che ho svolto</button>
    </form>
  )
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)))
}
