'use client'

import { useState } from 'react'
import { captureKnowledgeNote } from './actions'
import { KnowledgeFileUploader } from './KnowledgeFileUploader'
import './knowledge-capture-modes.css'

type CaptureMode = 'FILE' | 'TEXT'

export function KnowledgeCaptureModes() {
  const [mode, setMode] = useState<CaptureMode>('FILE')

  return (
    <div className="knowledgeCaptureModes">
      <div className="captureModeChooser" role="group" aria-label="Come vuoi aggiungere il contenuto?">
        <button
          type="button"
          className={mode === 'FILE' ? 'active' : ''}
          aria-pressed={mode === 'FILE'}
          aria-controls="knowledge-capture-file"
          onClick={() => setMode('FILE')}
        >
          <span aria-hidden>↑</span>
          <strong>Carica un file</strong>
          <small>PDF, immagini, DOCX o testo</small>
        </button>
        <button
          type="button"
          className={mode === 'TEXT' ? 'active' : ''}
          aria-pressed={mode === 'TEXT'}
          aria-controls="knowledge-capture-text"
          onClick={() => setMode('TEXT')}
        >
          <span aria-hidden>✎</span>
          <strong>Incolla testo</strong>
          <small>Appunti o contenuto già copiato</small>
        </button>
      </div>

      <div
        id="knowledge-capture-text"
        className="captureModeBlock knowledgeCaptureMode"
        data-active={mode === 'TEXT' ? 'true' : 'false'}
      >
        <div className="captureModeHeading"><strong>Incolla un testo</strong><span>Pronto per la ricerca in pochi secondi</span></div>
        <form action={captureKnowledgeNote} className="knowledgeCaptureForm">
          <label><span>Titolo, se vuoi</span><input name="title" maxLength={180} placeholder="Es. Collegio docenti — appunti" /></label>
          <label><span>Contenuto</span><textarea name="text" rows={7} required placeholder="Incolla o scrivi qui. Conserverò il testo originale e lo organizzerò nella Conoscenza…" /></label>
          <div className="pipelineHint"><span>Originale</span><b>→</b><span>Contenuto leggibile</span><b>→</b><span>Informazioni utili</span><b>→</b><span>Ricerca</span></div>
          <button type="submit">Salva e organizza</button>
        </form>
      </div>

      <div className="captureDivider captureDividerDesktop"><span>oppure</span></div>

      <div
        id="knowledge-capture-file"
        className="captureModeBlock knowledgeCaptureMode"
        data-active={mode === 'FILE' ? 'true' : 'false'}
      >
        <div className="captureModeHeading"><strong>Carica un file</strong><span>Privato · massimo 20 MB</span></div>
        <KnowledgeFileUploader />
      </div>
    </div>
  )
}
