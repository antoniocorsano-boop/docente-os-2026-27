'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnonymousKnowledgeNoteForm } from './AnonymousKnowledgeNoteForm'
import { KnowledgeFileUploader } from './KnowledgeFileUploader'

type CaptureMode = 'text' | 'file'

export function KnowledgeCaptureModes({
  initialMode = 'text',
  sourceHint = null,
  postUploadQuery = null,
}: {
  initialMode?: CaptureMode
  sourceHint?: string | null
  postUploadQuery?: string | null
}) {
  const [mode, setMode] = useState<CaptureMode>(initialMode)
  const searchParams = useSearchParams()
  const taskPostCaptureQuery = buildTaskPostCaptureQuery(searchParams)
  const effectivePostCaptureQuery = postUploadQuery ?? taskPostCaptureQuery

  return (
    <>
      {sourceHint ? (
        <div className="knowledgeCaptureAssurance" role="note">
          <span className="statusPill">Libro di testo</span>
          <p>{sourceHint}</p>
        </div>
      ) : null}

      <div className="knowledgeCaptureModeSwitch" role="group" aria-label="Scegli come aggiungere un contenuto">
        <button type="button" aria-pressed={mode === 'text'} onClick={() => setMode('text')}>
          <strong>Incolla un testo</strong><span>Appunti e contenuti già scritti</span>
        </button>
        <button type="button" aria-pressed={mode === 'file'} onClick={() => setMode('file')}>
          <strong>Carica un file</strong><span>PDF, DOCX, immagini e testo</span>
        </button>
      </div>

      <div className="knowledgeCaptureAssurance" role="note">
        <span className="statusPill">Pilot anonimo</span>
        <p>Non inserire nomi di studenti, recapiti, dati familiari, sanitari o altri dati personali. I riferimenti generali a DSA/BES, PDP/PEI restano ammessi se non descrivono una persona identificata. Il controllo automatico non sostituisce la verifica umana.</p>
      </div>

      <div className={`captureModeBlock captureModeText ${mode === 'text' ? 'isActive' : ''}`} data-capture-mode-panel="text">
        <div className="captureModeHeading"><strong>Incolla un testo</strong><span>Pronto per la ricerca in pochi secondi</span></div>
        <AnonymousKnowledgeNoteForm postCaptureQuery={effectivePostCaptureQuery} />
      </div>

      <div className="captureDivider"><span>oppure</span></div>

      <div className={`captureModeBlock captureModeFile ${mode === 'file' ? 'isActive' : ''}`} data-capture-mode-panel="file">
        <div className="captureModeHeading"><strong>Carica un file</strong><span>Privato · massimo 20 MB</span></div>
        <KnowledgeFileUploader postUploadQuery={effectivePostCaptureQuery} />
      </div>
    </>
  )
}

function buildTaskPostCaptureQuery(searchParams: { get(name: string): string | null }) {
  const taskMode = searchParams.get('mode')
  const returnTo = searchParams.get('returnTo')
  if ((taskMode !== 'prepare' && taskMode !== 'class') || !returnTo) return null

  const params = new URLSearchParams()
  params.set('mode', taskMode)
  params.set('returnTo', returnTo)
  const sectionId = searchParams.get('section')?.trim()
  const blockId = searchParams.get('block')?.trim()
  if (sectionId) params.set('section', sectionId)
  if (blockId) params.set('block', blockId)
  return params.toString()
}
