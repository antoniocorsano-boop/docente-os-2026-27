'use client'

import { useState } from 'react'
import { TimetableSharedIntake } from '@/app/share-target/TimetableSharedIntake'

export function TimetableLocalImportLauncher({
  defaultEffectiveFrom,
}: {
  defaultEffectiveFrom: string
}) {
  const [file, setFile] = useState<File | null>(null)

  return (
    <div className="timetableLocalImportLauncher">
      {!file ? (
        <label className="timetableLocalFilePicker">
          <span>PDF dell’orario</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
          />
          <small>Il PDF resta sul dispositivo. Dopo la scelta inserirai il nominativo e Docente OS ricostruirà automaticamente il tuo orario settimanale.</small>
        </label>
      ) : (
        <>
          <div className="timetableLocalFileSummary">
            <strong>{file.name}</strong>
            <button type="button" onClick={() => setFile(null)}>Cambia file</button>
          </div>
          <TimetableSharedIntake
            file={file}
            defaultEffectiveFrom={defaultEffectiveFrom}
            sourceMode="LOCAL_MINIMIZED_UPLOAD"
            onBeforeSubmit={() => undefined}
          />
        </>
      )}
    </div>
  )
}
