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
      setError('Atlas non ha restituito un pacchetto di materiali da rivedere.')
      return
    }
    try {
      setBundle(decodeAtlasMaterialBundle(encoded))
    } catch {
      setError('Il pacchetto restituito da Atlas non è valido. Nessuna modifica è stata applicata.')
    }
  }, [])

  if (error) {
    return <section className="atlasReturnError"><strong>Materiali non disponibili</strong><p>{error}</p><Link href="/progetta">Torna a Progetta</Link></section>
  }

  if (!bundle) return <p className="atlasReturnLoading">Sto controllando i materiali restituiti da Atlas…</p>

  return (
    <main className="atlasReturnFlow">
      <nav><Link href="/progetta">← Progetta</Link></nav>
      <header className="atlasReturnHeader">
        <p>RITORNO DA STUDIO ATLAS</p>
        <h1>Controlla i materiali prima di associarli</h1>
        <span>Atlas ha restituito una proposta per l’UDA {bundle.sourceUdaId}. Non è stato ancora salvato alcun collegamento alla lezione.</span>
      </header>

      <section className="atlasReturnMaterials" aria-labelledby="atlas-return-materials-title">
        <div className="atlasReturnSectionHeading"><div><small>PROPOSTA SELEZIONATA</small><h2 id="atlas-return-materials-title">{bundle.items.length} materiali pronti per la revisione</h2></div><strong>Origine: Atlas</strong></div>
        <div className="atlasReturnGrid">
          {bundle.items.map((item) => <article key={item.materialId}><small>{materialLabel(item.type)}</small><strong>{item.title}</strong><p>{item.description}</p></article>)}
        </div>
      </section>

      <aside className="atlasReturnDecision">
        <div><small>ASSOCIAZIONE</small><strong>La scrittura resta sotto il tuo controllo</strong><p>Il prossimo passo collega questi materiali a una lezione reale della classe. Questa prima integrazione non crea collegamenti impliciti.</p></div>
        <button type="button" disabled>Associa alla lezione</button>
      </aside>
      <p className="atlasReturnPending">Il selettore della lezione e il binding persistente sono il prossimo task dello stesso slice; il comando resta intenzionalmente disabilitato finché quella persistenza non è qualificata.</p>
    </main>
  )
}

function materialLabel(type: AtlasMaterialBundle['items'][number]['type']) {
  return ({ presentation: 'PRESENTAZIONE', worksheet: 'SCHEDA DI LAVORO', guide: 'GUIDA', rubric: 'RUBRICA' } as const)[type]
}
