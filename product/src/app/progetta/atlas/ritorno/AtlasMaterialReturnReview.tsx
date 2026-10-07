'use client'

import Link from 'next/link'
import { useActionState, useState, useSyncExternalStore } from 'react'
import { decodeAtlasMaterialBundle, type AtlasMaterialBundle } from '@/core/domain/atlas-material-handoff'
import { bindAtlasMaterialsToLesson, type AtlasMaterialBindState } from './actions'

export type AtlasLessonOption = {
  blockId: string
  title: string
  period: string
}

const INITIAL_STATE: AtlasMaterialBindState = { error: null }
const SERVER_HASH_SNAPSHOT = '__atlas_return_server__'

export function AtlasMaterialReturnReview({
  sectionId,
  expectedUda,
  lessons,
  preferredBlockId,
}: {
  sectionId: string
  expectedUda: string
  lessons: AtlasLessonOption[]
  preferredBlockId: string
}) {
  const hash = useSyncExternalStore(subscribeToHash, readHash, readServerHash)
  const [selectedBlockId, setSelectedBlockId] = useState(preferredBlockId)
  const [state, action, pending] = useActionState(bindAtlasMaterialsToLesson, INITIAL_STATE)

  if (hash === SERVER_HASH_SNAPSHOT) {
    return <p className="atlasReturnLoading">Sto controllando i materiali…</p>
  }

  const resolved = resolveBundleFromHash(hash)
  if (resolved.error) {
    return <section className="atlasReturnError"><strong>Materiali non disponibili</strong><p>{resolved.error}</p><Link href="/progetta">Torna a Progetta</Link></section>
  }

  if (!resolved.bundle || !resolved.encodedBundle) {
    return <p className="atlasReturnLoading">Sto controllando i materiali…</p>
  }

  const contextError = !sectionId
    ? 'Apri l’UDA dal contesto di una classe per scegliere la lezione.'
    : !expectedUda
      ? 'Questa UDA non è ancora collegata al piano annuale.'
      : !lessons.length
        ? 'Non ci sono ancora lezioni disponibili per questa UDA nel piano annuale.'
        : null
  const contextReady = !contextError

  return (
    <main className="atlasReturnFlow">
      <nav><Link href="/progetta">← Progetta</Link></nav>
      <header className="atlasReturnHeader">
        <h1>Associa i materiali alla lezione</h1>
        <p>Scegli la lezione in cui vuoi ritrovare questi materiali.</p>
      </header>

      <section className="atlasReturnMaterials" aria-label="Materiali scelti">
        <div className="atlasReturnGrid">
          {resolved.bundle.items.map((item) => (
            <article key={item.materialId}>
              <span aria-hidden>{materialIcon(item.type)}</span>
              <div><strong>{item.title}</strong><small>{materialLabel(item.type)}</small></div>
            </article>
          ))}
        </div>
      </section>

      <form action={action} className="atlasReturnAssociation">
        <input type="hidden" name="bundle" value={resolved.encodedBundle} />
        <input type="hidden" name="sectionId" value={sectionId} />
        <input type="hidden" name="expectedUda" value={expectedUda} />

        <section className="atlasReturnLesson" aria-label="Lezione di destinazione">
          <label htmlFor="atlas-target-lesson">Lezione</label>
          <select
            id="atlas-target-lesson"
            name="blockId"
            value={selectedBlockId}
            onChange={(event) => setSelectedBlockId(event.target.value)}
            disabled={!contextReady || pending}
          >
            <option value="">Scegli una lezione</option>
            {lessons.map((lesson) => <option key={lesson.blockId} value={lesson.blockId}>{lesson.title} · {lesson.period}</option>)}
          </select>
          {contextError ? <p className="atlasReturnContextError">{contextError}</p> : null}
        </section>

        {state.error ? <p className="atlasReturnActionError" role="alert">{state.error}</p> : null}
        <button className="atlasReturnPrimary" type="submit" disabled={!selectedBlockId || pending}>
          {pending ? 'Associazione in corso…' : 'Associa alla lezione'}
        </button>
      </form>
    </main>
  )
}

function subscribeToHash(onStoreChange: () => void) {
  window.addEventListener('hashchange', onStoreChange)
  return () => window.removeEventListener('hashchange', onStoreChange)
}

function readHash() {
  return window.location.hash
}

function readServerHash() {
  return SERVER_HASH_SNAPSHOT
}

function resolveBundleFromHash(hash: string): {
  bundle: AtlasMaterialBundle | null
  encodedBundle: string
  error: string | null
} {
  const encodedBundle = new URLSearchParams(hash.replace(/^#/, '')).get('bundle') ?? ''
  if (!encodedBundle) {
    return {
      bundle: null,
      encodedBundle: '',
      error: 'Atlas non ha restituito materiali da associare.',
    }
  }

  try {
    return {
      bundle: decodeAtlasMaterialBundle(encodedBundle),
      encodedBundle,
      error: null,
    }
  } catch {
    return {
      bundle: null,
      encodedBundle: '',
      error: 'I materiali restituiti non sono validi. Nessuna modifica è stata applicata.',
    }
  }
}

function materialLabel(type: AtlasMaterialBundle['items'][number]['type']) {
  return ({ presentation: 'Presentazione', worksheet: 'Scheda di lavoro', guide: 'Guida', rubric: 'Rubrica' } as const)[type]
}

function materialIcon(type: AtlasMaterialBundle['items'][number]['type']) {
  return ({ presentation: '▣', worksheet: '□', guide: '◇', rubric: '✓' } as const)[type]
}
