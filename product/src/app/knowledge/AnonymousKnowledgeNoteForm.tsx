'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { inspectFreeTextForPilot, pilotPrivacyErrorMessage } from '@/core/privacy/anonymization-guard'
import { captureAnonymousKnowledgeNote } from './anonymous-actions'

export function AnonymousKnowledgeNoteForm() {
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null)

  function preflight(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget)
    const title = String(formData.get('title') ?? '')
    const text = String(formData.get('text') ?? '')
    const result = inspectFreeTextForPilot(`${title}\n${text}`)
    if (!result.allowed) {
      event.preventDefault()
      setPrivacyMessage(pilotPrivacyErrorMessage(result))
      return
    }
    setPrivacyMessage(null)
  }

  return (
    <form action={captureAnonymousKnowledgeNote} className="knowledgeCaptureForm" onSubmit={preflight}>
      <label><span>Titolo, se vuoi</span><input name="title" maxLength={180} placeholder="Es. Collegio docenti — appunti" /></label>
      <label><span>Contenuto</span><textarea name="text" rows={7} required placeholder="Incolla o scrivi qui solo contenuti privi di dati personali…" /></label>
      {privacyMessage ? <div className="knowledgeUploadFeedback error" role="alert"><div><strong>Contenuto non ammesso nel pilot anonimo</strong><p>{privacyMessage}</p></div></div> : null}
      <div className="pipelineHint"><span>Controllo privacy</span><b>→</b><span>Originale</span><b>→</b><span>Contenuto leggibile</span><b>→</b><span>Ricerca</span></div>
      <button type="submit">Controlla, salva e organizza</button>
    </form>
  )
}
