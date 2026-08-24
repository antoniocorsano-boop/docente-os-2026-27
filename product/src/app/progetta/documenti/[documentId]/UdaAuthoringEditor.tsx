'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { AuthoredDocumentSnapshot } from '@/core/domain/authored-document'
import { saveUdaAuthoring } from '../../authoring-actions'

export function UdaAuthoringEditor({ snapshot }: { snapshot: AuthoredDocumentSnapshot }) {
  const router = useRouter()
  const [title, setTitle] = useState(snapshot.current.title)
  const [body, setBody] = useState(snapshot.current.bodyMarkdown)
  const [savedTitle, setSavedTitle] = useState(snapshot.current.title)
  const [savedBody, setSavedBody] = useState(snapshot.current.bodyMarkdown)
  const [version, setVersion] = useState(snapshot.document.currentVersionNo)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const dirty = title !== savedTitle || body !== savedBody

  function save() {
    setMessage(null)
    startTransition(async () => {
      try {
        const next = await saveUdaAuthoring({
          documentId: snapshot.document.id,
          expectedCurrentVersion: version,
          title,
          bodyMarkdown: body,
        })
        setVersion(next)
        setSavedTitle(title)
        setSavedBody(body)
        setMessage(`Versione ${next} salvata`)
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Salvataggio non riuscito')
      }
    })
  }

  return (
    <div className="udaAuthoringLayout">
      <main className="udaAuthoringMain">
        <div className="udaAuthoringToolbar">
          <div><span>DOCUMENTO DI LAVORO</span><strong>Versione {version}</strong></div>
          <button type="button" onClick={save} disabled={pending || !dirty || !title.trim()}>{pending ? 'Salvataggio…' : 'Salva nuova versione'}</button>
        </div>
        {message ? <p className="udaAuthoringMessage" role="status">{message}</p> : null}
        <label className="udaAuthoringTitle">Titolo<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={300} /></label>
        <label className="udaAuthoringBody">Contenuto<textarea value={body} onChange={(event) => setBody(event.target.value)} spellCheck rows={28} /></label>
        <p className="udaAuthoringGuard">La fonte originale non viene modificata. Ogni salvataggio crea una nuova versione immutabile del documento di lavoro.</p>
      </main>
      <aside className="udaAuthoringHistory" aria-label="Cronologia versioni">
        <span>CRONOLOGIA</span>
        <h2>Versioni</h2>
        <ol>{snapshot.versions.map((item) => <li key={item.id}><strong>v{item.versionNo}</strong><span>{item.title}</span><small>{new Date(item.createdAt).toLocaleString('it-IT')}</small><Link href={`/progetta/documenti/${encodeURIComponent(snapshot.document.id)}/export?version=${item.versionNo}`}>Esporta v{item.versionNo}</Link></li>)}</ol>
        {dirty ? <p>Modifiche locali non ancora salvate.</p> : <p>Tutte le modifiche sono salvate.</p>}
      </aside>
    </div>
  )
}
