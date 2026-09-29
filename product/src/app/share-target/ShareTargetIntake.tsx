'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { KnowledgeFileUploader } from '@/app/knowledge/KnowledgeFileUploader'

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

  async function clearStaging() {
    try {
      const cache = await caches.open(SHARE_CACHE)
      const keys = await cache.keys()
      await Promise.all(
        keys
          .filter((request) => new URL(request.url).pathname.startsWith(SHARE_PREFIX + intakeId + '/'))
          .map((request) => cache.delete(request)),
      )
    } catch (cleanupError) {
      console.warn('Docente OS shared intake cleanup failed', cleanupError)
    }
  }

  return (
    <main className="sharedIntakeSurface">
      <section className="sharedIntakeCard" aria-labelledby="shared-intake-title">
        <p className="contextLine">Ricevuto dal dispositivo · ancora locale</p>
        <h1 id="shared-intake-title">Condividi con Docente OS</h1>
        <p>
          Il file resta sul dispositivo finché non confermi il caricamento. Passerà gli stessi controlli
          privacy e contenuto della Conoscenza.
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
            <KnowledgeFileUploader
              initialFile={file}
              postUploadQuery="source=share-target"
              onCompleted={() => { void clearStaging() }}
            />
          </>
        ) : (
          <p role="status">Sto preparando il file condiviso…</p>
        )}

        <p className="knowledgeUploadTrust">
          Dopo l’acquisizione potrai valutarlo con i workflow già esistenti: Conoscenza, circolari/Calendario,
          aggiornamento orario o materiali della lezione. Nessuna destinazione viene scelta automaticamente.
        </p>
      </section>
    </main>
  )
}
