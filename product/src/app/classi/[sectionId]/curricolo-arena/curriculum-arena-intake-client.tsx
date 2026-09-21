'use client'

import { useActionState, useState } from 'react'
import {
  buildAnnualPlanFrameworkReviewDraftV2,
  type AnnualPlanFrameworkReviewDraftV2,
} from '@/core/domain/cml-handoff-v2-acceptance'
import {
  parseCmlLocalHandoffV2Json,
  type CmlLocalHandoffV2,
} from '@/core/domain/cml-local-handoff-v2'
import {
  ECO02_PILOT_UPLOAD_MAX_BYTES,
  hasUploadedArenaAuthorityClaim,
} from '@/core/domain/cml-discipline-binding'
import {
  acceptArenaCurriculumHandoff,
  type CurriculumArenaIntakeActionState,
} from './actions'

const CURRICULUM_ARENA_INTAKE_INITIAL_STATE: CurriculumArenaIntakeActionState = {
  status: 'idle',
  message: null,
}

type Preview = {
  handoff: CmlLocalHandoffV2
  draft: AnnualPlanFrameworkReviewDraftV2
  json: string
}

export function CurriculumArenaIntakeClient({
  sectionId,
  currentFootprint,
}: {
  sectionId: string
  currentFootprint: string | null
}) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [state, formAction, pending] = useActionState(
    acceptArenaCurriculumHandoff,
    CURRICULUM_ARENA_INTAKE_INITIAL_STATE,
  )

  async function onFile(file: File | null) {
    setPreview(null)
    setLocalError(null)
    if (!file) return
    if (file.size > ECO02_PILOT_UPLOAD_MAX_BYTES) {
      setLocalError('Il file supera 500 KB: esporta di nuovo il passaggio direttamente da Arena.')
      return
    }
    try {
      const json = await file.text()
      const handoff = parseCmlLocalHandoffV2Json(json)
      const draft = buildAnnualPlanFrameworkReviewDraftV2(handoff)
      setPreview({ handoff, draft, json })
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Il file non è un passaggio Arena valido.')
    }
  }

  const alreadyKnown = Boolean(
    preview && currentFootprint && preview.handoff.structuralFootprint.hash === currentFootprint,
  )
  const unverifiedApprovedClaim = Boolean(
    preview && hasUploadedArenaAuthorityClaim(preview.handoff.curricularContext),
  )

  return (
    <article className="classWorkspaceCard" aria-labelledby="arena-intake-title">
      <div>
        <h2 id="arena-intake-title">Importa da Arena</h2>
        <p>Usa il file scaricato da Arena. Prima vedi la provenienza e il contesto; nulla viene scritto finché non confermi.</p>
      </div>

      <label>
        <span>Passaggio Arena per Docente OS</span>
        <input
          type="file"
          accept=".json,.cml-handoff.json,application/json"
          onChange={(event) => void onFile(event.target.files?.[0] ?? null)}
        />
      </label>

      {localError ? <p role="alert">{localError}</p> : null}
      {state.status === 'error' && state.message ? <p role="alert">{state.message}</p> : null}

      {preview ? (
        <div className="classAssignmentList">
          <div className="classAssignmentItem">
            <div><strong>Fonte</strong><span>{preview.handoff.annualPlanningFramework.sourceProduct}</span></div>
            <small>{preview.handoff.format}</small>
          </div>
          <div className="classAssignmentItem">
            <div><strong>Classe</strong><span>{preview.handoff.curricularContext.sectionRef ?? preview.handoff.curricularContext.cohortRef}</span></div>
            <small>{preview.handoff.curricularContext.schoolYearRef}</small>
          </div>
          <div className="classAssignmentItem">
            <div><strong>Curricolo</strong><span>{curriculumStateLabel(preview.handoff.curricularContext.curriculumState)}</span></div>
            <small>{preview.handoff.curricularContext.applicabilityStatus}</small>
          </div>
          <div className="classAssignmentItem">
            <div><strong>Requisiti</strong><span>{preview.handoff.curricularContext.requirements.length} nel passaggio</span></div>
            <small>{preview.draft.constraints.length} vincoli di progettazione</small>
          </div>
          <div className="classAssignmentItem">
            <div><strong>Impronta strutturale</strong><span>{preview.handoff.structuralFootprint.hash}</span></div>
            <small>{preview.handoff.structuralFootprint.algorithm} v{preview.handoff.structuralFootprint.version}</small>
          </div>
        </div>
      ) : null}

      {preview?.handoff.curricularContext.curriculumState === 'PROVISIONAL_COMPLETE' && !unverifiedApprovedClaim ? (
        <p>
          Questa baseline è completa per progettare ma non è un’approvazione istituzionale del curricolo.
          Docente OS la conserverà come <strong>provvisoria</strong>. Un’eventuale approvazione definitiva dovrà arrivare
          tramite un segnale Arena verificabile lato server e sarà sottoposta a rivalidazione del docente.
        </p>
      ) : null}

      {unverifiedApprovedClaim ? (
        <p role="alert">
          <strong>Approvazione non acquisibile da questo file.</strong> Il caricamento locale permette anteprima e controllo,
          ma non può attestare autorità istituzionale. Serve un passaggio Arena verificabile lato server.
        </p>
      ) : null}

      {preview ? (
        alreadyKnown ? (
          <p><strong>Questa stessa baseline è già acquisita per la classe.</strong></p>
        ) : unverifiedApprovedClaim ? (
          <p><strong>Anteprima soltanto.</strong> Nessuna autorità istituzionale verrà salvata da questo caricamento.</p>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="sectionId" value={sectionId} />
            <input type="hidden" name="handoffJson" value={preview.json} />
            <button type="submit" disabled={pending}>
              {pending ? 'Conferma in corso…' : 'Accetta baseline provvisoria per questa classe'}
            </button>
          </form>
        )
      ) : null}
    </article>
  )
}

function curriculumStateLabel(value: CmlLocalHandoffV2['curricularContext']['curriculumState']) {
  return value === 'APPROVED'
    ? 'Approvazione dichiarata nel file · da verificare'
    : 'Completo per progettare · provvisorio'
}
