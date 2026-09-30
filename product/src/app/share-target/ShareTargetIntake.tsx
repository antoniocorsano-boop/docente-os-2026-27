'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { KnowledgeFileUploader } from '@/app/knowledge/KnowledgeFileUploader'
import { TimetableSharedIntake } from './TimetableSharedIntake'
import { looksLikeTimetablePdf } from './timetable-share-helpers'
import { clearShareIntakeStaging } from './share-target-staging'

const SHARE_CACHE = 'docente-os-share-intake-v1'
const SHARE_PREFIX = '/__share-intake/'

type ShareMeta = {
  id: string
  receivedAt: string
  title: string
  text: string
  url: string
  files: Array<{ index: number; name: string; type: string; size: number }>
}

export function ShareTargetIntake({ intakeId }: { intakeId: string }) {
  const [meta, setMeta] = useState<ShareMeta | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!('caches' in window)) {
        setError('Lo staging locale non è disponibile in questo browser.')
        return
      }

      try {
        const cache = await caches.open(SHARE_CACHE)
        const metaResponse = await cache.match(SHARE_PREFIX + intakeId + '/meta')
        if (!metaResponse) {
          if (!cancelled) setError('Il contenuto condiviso non è più disponibile sul dispositivo.')
          return
        }

        const nextMeta = await metaResponse.json() as ShareMeta
        if (!nextMeta.files.length) {
          if (!cancelled) {
            setMeta(nextMeta)
            setError('La condivisione non contiene un file supportato.')
          }
          return
        }

        if (nextMeta.files.length > 1) {
          if (!cancelled) {
            setMeta(nextMeta)
            setError('Per il pilot condividi un file alla volta, così ogni contenuto resta verificabile.')
          }
          return
        }

        const descriptor = nextMeta.files[0]
        const fileResponse = await cache.match(SHARE_PREFIX + intakeId + '/file/' + descriptor.index)
        if (!fileResponse) {
          if (!cancelled) setError('Il file condiviso non è più disponibile sul dispositivo.')
          return
        }

        const blob = await fileResponse.blob()
        const nextFile = new File([blob], descriptor.name, {
          type: descriptor.type || blob.type,
          lastModified: Date.now(),
        })

        if (!cancelled) {
          setMeta(nextMeta)
          setFile(nextFile)
        }
      } catch (loadError) {
        console.error('Docente OS shared intake load failed', loadError)
        if (!cancelled) setError('Non sono riuscito a leggere il contenuto condiviso. Nessun file è stato caricato.')
      }
    }

    void load()
    return () => { cancelled = true }
  }, [intakeId])

  const clearStaging = useCallback(async () => {
    const cache = await caches.open(SHARE_CACHE)
    await clearShareIntakeStaging(cache, intakeId, SHARE_PREFIX)
  }, [intakeId])

  const cancelIntake = useCallback(async () => {
    if (cancelling) return
    setCancelling(true)
    setError(null)
    try {
      await clearStaging()
      const destination = file && looksLikeTimetable(meta, file) ? '/orario' : '/knowledge'
      window.location.assign(destination)
    } catch (cleanupError) {
      console.error('Docente OS shared intake cancellation cleanup failed', cleanupError)
      setCancelling(false)
      setError('Non sono riuscito a rimuovere il file condiviso dal dispositivo. L’acquisizione resta bloccata: riprova Annulla prima di uscire.')
    }
  }, [cancelling, clearStaging, file, meta])

  return (
    <main className="sharedIntakeSurface">
      <section className="sharedIntakeCard" aria-labelledby="shared-intake-title">
        <p className="contextLine">Ricevuto dal dispositivo · ancora locale</p>
        <h1 id="shared-intake-title">Condividi con Docente OS</h1>
        <p>
          Il file è già stato ricevuto da Docente OS e resta sul dispositivo. Conferma solo quando vuoi
          autorizzare i controlli privacy e il salvataggio governato.
        </p>

        {meta?.title ? <p><strong>Titolo condiviso:</strong> {meta.title}</p> : null}
        {meta?.text ? <p><strong>Nota:</strong> {meta.text}</p> : null}

        {error ? (
          <div className="knowledgeFeedback" role="alert">
            {error} <Link href="/knowledge">Apri Conoscenza</Link>
          </div>
        ) : file ? (
          <>
            <div className="knowledgeFeedback" role="status">
              <strong>{file.name}</strong> · {(file.size / 1024 / 1024).toFixed(file.size > 1024 * 1024 ? 1 : 2)} MB
            </div>
            {looksLikeTimetable(meta, file) ? (
              <TimetableSharedIntake
                key={`${file.name}:${file.size}:${file.lastModified}`}
                file={file}
                onBeforeSubmit={clearStaging}
              />
            ) : (
              <KnowledgeFileUploader
                initialFile={file}
                postUploadQuery="source=share-target"
                onCompleted={() => { void clearStaging().catch((cleanupError) => console.warn('Docente OS shared intake cleanup failed', cleanupError)) }}
                sharedIntake
              />
            )}
          </>
        ) : (
          <p role="status">Sto preparando il file condiviso…</p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" onClick={() => void cancelIntake()} disabled={cancelling}>
            {cancelling ? 'Rimuovo il file locale…' : 'Annulla acquisizione e rimuovi il file locale'}
          </button>
        </div>

        <p className="knowledgeUploadTrust">
          I documenti che sembrano orari vengono instradati automaticamente al flusso dedicato, che invia soltanto le aree scelte localmente.
          Gli altri file continuano a usare l’acquisizione governata di Conoscenza. Nessuna modifica all’orario viene applicata senza conferma.
          Se abbandoni senza annullare, lo staging temporaneo scade automaticamente.
        </p>
      </section>
    </main>
  )
}


function looksLikeTimetable(meta: ShareMeta | null, file: File) {
  return looksLikeTimetablePdf({
    title: meta?.title,
    fileName: file.name,
    fileType: file.type,
  })
}
