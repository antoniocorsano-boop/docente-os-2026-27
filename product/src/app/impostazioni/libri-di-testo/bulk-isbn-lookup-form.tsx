'use client'

import { useActionState, useRef, useState, type ChangeEvent } from 'react'
import { useFormStatus } from 'react-dom'
import { lookupTextbookByIsbnForAssignments, type IsbnLookupState } from './actions'
import styles from './bulk-isbn-lookup.module.css'

const INITIAL_STATE: IsbnLookupState = { status: 'idle', message: '' }

type AssignmentOption = {
  id: string
  label: string
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect(source: unknown): Promise<Array<{ rawValue?: string }>>
}

export function BulkIsbnLookupForm({ assignments }: { assignments: AssignmentOption[] }) {
  const [state, action] = useActionState(lookupTextbookByIsbnForAssignments, INITIAL_STATE)
  const [isbn, setIsbn] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [scanMessage, setScanMessage] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)

  function toggleAssignment(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((current) => current.size === assignments.length
      ? new Set()
      : new Set(assignments.map((assignment) => assignment.id)))
  }

  async function scanPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const Detector = (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
    if (!Detector || typeof createImageBitmap !== 'function') {
      setScanMessage('La lettura automatica dalla foto non è disponibile su questo browser. Puoi inserire o incollare l’ISBN nello stesso campo.')
      event.target.value = ''
      return
    }

    setScanMessage('Leggo il codice dalla foto…')
    try {
      const image = await createImageBitmap(file)
      const detector = new Detector({ formats: ['ean_13'] })
      const results = await detector.detect(image)
      image.close()
      const detected = results
        .map((result) => result.rawValue?.replace(/[^0-9]/g, '') ?? '')
        .find((value) => /^[0-9]{13}$/.test(value))

      if (!detected) {
        setScanMessage('Non ho riconosciuto un ISBN-13 nella foto. Prova a inquadrare soltanto il codice a barre oppure inserisci il numero.')
      } else {
        setIsbn(detected)
        setScanMessage(`ISBN ${detected} riconosciuto dalla foto. La foto resta sul dispositivo e non viene caricata.`)
      }
    } catch {
      setScanMessage('Non sono riuscito a leggere il codice dalla foto. Puoi riprovare o inserire l’ISBN manualmente.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <section className={styles.card} aria-labelledby="bulk-isbn-title">
      <header className={styles.header}>
        <div>
          <span>AGGIUNTA RAPIDA · ALTERNATIVA AL MIM</span>
          <h2 id="bulk-isbn-title">Un libro, più classi in un solo passaggio</h2>
          <p>Inserisci l’ISBN una sola volta oppure fotografa il codice a barre. Poi scegli tutte le Cattedre a cui collegare lo stesso testo.</p>
        </div>
        <strong>{selected.size} {selected.size === 1 ? 'Cattedra selezionata' : 'Cattedre selezionate'}</strong>
      </header>

      <form action={action} className={styles.form}>
        <div className={styles.lookupRow}>
          <label className={styles.isbnField}>
            <span>ISBN-13</span>
            <input
              name="isbn13"
              inputMode="numeric"
              autoComplete="off"
              placeholder="978…"
              value={isbn}
              onChange={(event) => setIsbn(event.target.value)}
              required
            />
          </label>

          <label className={styles.photoButton}>
            <input
              ref={photoInputRef}
              className={styles.hiddenFile}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={scanPhoto}
            />
            Fotografa il codice ISBN
          </label>

          <label className={styles.usageField}>
            <span>Uso</span>
            <select name="usageKind" defaultValue="ADOPTED">
              <option value="ADOPTED">Adottato</option>
              <option value="RECOMMENDED">Consigliato</option>
              <option value="OTHER">Altro testo</option>
            </select>
          </label>
        </div>

        {scanMessage ? <p className={styles.scanMessage} role="status">{scanMessage}</p> : null}

        <div className={styles.assignmentHeader}>
          <div>
            <strong>Scegli classi e discipline</strong>
            <span>Il recupero bibliografico avviene una sola volta; ogni collegamento resta una proposta indipendente da confermare.</span>
          </div>
          <button className={styles.selectAll} type="button" onClick={toggleAll}>
            {selected.size === assignments.length ? 'Deseleziona tutte' : 'Seleziona tutte'}
          </button>
        </div>

        <div className={styles.assignmentGrid}>
          {assignments.map((assignment) => (
            <label className={styles.assignmentOption} key={assignment.id}>
              <input
                type="checkbox"
                name="teachingAssignmentIds"
                value={assignment.id}
                checked={selected.has(assignment.id)}
                onChange={() => toggleAssignment(assignment.id)}
              />
              <span>{assignment.label}</span>
            </label>
          ))}
        </div>

        {state.message ? (
          <p className={`${styles.result} ${state.status === 'error' ? styles.error : styles.success}`} role={state.status === 'error' ? 'alert' : 'status'}>
            {state.message}
          </p>
        ) : null}

        <SubmitButton selectedCount={selected.size} />
      </form>
    </section>
  )
}

function SubmitButton({ selectedCount }: { selectedCount: number }) {
  const { pending } = useFormStatus()
  return (
    <button className="settingsPrimaryButton" type="submit" disabled={pending || selectedCount === 0}>
      {pending
        ? 'Recupero il libro…'
        : selectedCount === 0
          ? 'Seleziona almeno una Cattedra'
          : `Recupera una volta e proponi in ${selectedCount}`}
    </button>
  )
}
