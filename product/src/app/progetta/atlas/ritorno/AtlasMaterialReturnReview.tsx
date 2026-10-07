'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { decodeAtlasMaterialBundle, type AtlasMaterialBundle } from '@/core/domain/atlas-material-handoff'

export function AtlasMaterialReturnReview() {
  const [bundle, setBundle] = useState<AtlasMaterialBundle | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('bundle')
    if (!encoded) {
      setError('Atlas non ha restituito materiali da associare.')
      return
    }
    try {
      setBundle(decodeAtlasMaterialBundle(encoded))
    } catch {
      setError('I materiali restituiti non sono validi. Nessuna modifica è stata applicata.')
    }
  }, [])

  if (error) {
    return <section className="atlasReturnError"><strong>Materiali non disponibili</strong><p>{error}</p><Link href="/progetta">Torna a Progetta</Link></section>
  }

  if (!bundle) return <p className="atlasReturnLoading">Sto controllando i materiali…</p>

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

      <section className="atlasReturnLesson" aria-label="Lezione di destinazione">
        <label htmlFor="atlas-target-lesson">Lezione</label>
        <select id="atlas-target-lesson" disabled defaultValue="">
          <option value="">Scegli una lezione</option>
        </select>
      </section>

      <button className="atlasReturnPrimary" type="button" disabled>Associa alla lezione</button>
    </main>
  )
}

function materialLabel(type: AtlasMaterialBundle['items'][number]['type']) {
  return ({ presentation: 'Presentazione', worksheet: 'Scheda di lavoro', guide: 'Guida', rubric: 'Rubrica' } as const)[type]
}

function materialIcon(type: AtlasMaterialBundle['items'][number]['type']) {
  return ({ presentation: '▣', worksheet: '□', guide: '◇', rubric: '✓' } as const)[type]
}
