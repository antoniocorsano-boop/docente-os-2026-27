'use client'

import { useState } from 'react'
import { captureKnowledgeNote } from './actions'
import { KnowledgeFileUploader } from './KnowledgeFileUploader'

type CaptureMode = 'text' | 'file'

export function KnowledgeCaptureModes() {
  const [mode, setMode] = useState<CaptureMode>('text')

  return (
    <>
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
        <p>Non inserire nomi di studenti, recapiti, dati familiari, sanitari, DSA/BES, PDP/PEI o altri dati personali. DOCENTE OS blocca i segnali espliciti che riconosce, ma il controllo automatico non sostituisce la verifica umana.</p>
      </div>

      <div className={`captureModeBlock captureModeText ${mode === 'text' ? 'isActive' : ''}`} data-capture-mode-panel="text">
        <div className="captureModeHeading"><strong>Incolla un testo</strong><span>Pronto per la ricerca in pochi secondi</span></div>
        <form action={captureKnowledgeNote} className="knowledgeCaptureForm">
          <label><span>Titolo, se vuoi</span><input name="title" maxLength={180} placeholder="Es. Collegio docenti — appunti" /></label>
          <label><span>Contenuto</span><textarea name="text" rows={7} required placeholder="Incolla o scrivi qui solo contenuti privi di dati personali…" /></label>
          <div className="pipelineHint"><span>Controllo privacy</span><b>→</b><span>Originale</span><b>→</b><span>Contenuto leggibile</span><b>→</b><span>Ricerca</span></div>
          <button type="submit">Controlla, salva e organizza</button>
        </form>
      </div>

      <div className="captureDivider"><span>oppure</span></div>

      <div className={`captureModeBlock captureModeFile ${mode === 'file' ? 'isActive' : ''}`} data-capture-mode-panel="file">
        <div className="captureModeHeading"><strong>Carica un file</strong><span>Privato · massimo 20 MB</span></div>
        <KnowledgeFileUploader />
      </div>
    </>
  )
}
