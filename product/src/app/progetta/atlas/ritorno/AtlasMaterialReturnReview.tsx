'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { decodeAtlasMaterialBundle, type AtlasMaterialBundle } from '@/core/domain/atlas-material-handoff'
import { bindAtlasMaterialsToLesson, type AtlasMaterialBindState } from './actions'

export type AtlasLessonOption = {
  blockId: string
  title: string
  period: string
}

const INITIAL_STATE: AtlasMaterialBindState = { error: null }

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
  const [bundle, setBundle] = useState<AtlasMaterialBundle | null>(null)
  const [encodedBundle, setEncodedBundle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState(preferredBlockId)
  const [state, action, pending] = useActionState(bindAtlasMaterialsToLesson, INITIAL_STATE)

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('bundle')
    if (!encoded) {
      setError('Atlas non ha restituito materiali da associare.')
      return
    }
    try {
      setBundle(decodeAtlasMaterialBundle(encoded))
      setEncodedBundle(encoded)
    } catch {
      setError('I materiali restituiti non sono validi. Nessuna modifica è stata applicata.')
    }
  }, [])

  if (error) {
    return <section className="atlasReturnError"><strong>Materiali non disponibili</strong><p>{error}</p><Link href="/progetta">Torna a Progetta</Link></section>
  }

  if (!bundle) return <p className="atlasReturnLoading">Sto controllando i materiali…</p>

  const contextReady = Boolean(sectionId && expectedUda && lessons.length)

  return (
    <main className="atlasReturnFlow">
      <nav><Link href="/progetta">← Progetta</Link></nav>
      <header className="atlasReturnHeader">
        <h1>Associa i materiali alla lezione</h1>
        <p>Scegli la lezione in cui vuoi ritrovare questi materiali.</p>
      </header>

      <section className="atlasReturnMaterials" aria-label="Materiali scelti">
        <div className="atlasReturnGrid">
          {bundle.items.map((item) => (
            <article key={item.materialId}>
              <span aria-hidden>{materialIcon(item.type)}</span>
              <div><strong>{item.title}</strong><small>{materialLabel(item.type)}</small></div>
            </article>
          ))}
        </div>
      </section>

      <form action={action} className="atlasReturnAssociation">
        <input type="hidden" name="bundle" value={encodedBundle} />
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
          {!contextReady ? <p className="atlasReturnContextError">Apri l’UDA dal contesto di una classe per scegliere la lezione.</p> : null}
        </section>

        {state.error ? <p className="atlasReturnActionError" role="alert">{state.error}</p> : null}
        <button className="atlasReturnPrimary" type="submit" disabled={!selectedBlockId || pending}>
          {pending ? 'Associazione in corso…' : 'Associa alla lezione'}
        </button>
      </form>
    </main>
  )
}

function materialLabel(type: AtlasMaterialBundle['items'][number]['type']) {
  return ({ presentation: 'Presentazione', worksheet: 'Scheda di lavoro', guide: 'Guida', rubric: 'Rubrica' } as const)[type]
}

function materialIcon(type: AtlasMaterialBundle['items'][number]['type']) {
  return ({ presentation: '▣', worksheet: '□', guide: '◇', rubric: '✓' } as const)[type]
}
