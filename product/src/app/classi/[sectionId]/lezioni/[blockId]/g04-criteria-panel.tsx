'use client'

import type { G04Proposal, G04SessionSelection } from '@/core/presentation/curr-ref-g04-criteria'
import { isG04SessionConfirmed } from '@/core/presentation/curr-ref-g04-criteria'

type Props = {
  proposal: G04Proposal
  selection: G04SessionSelection
  onToggle: (id: string) => void
  onConfirm: () => void
}

export default function G04CriteriaPanel({
  proposal,
  selection,
  onToggle,
  onConfirm,
}: Props) {
  const confirmed = isG04SessionConfirmed(selection)
  return (
    <section className="g04CriteriaPanel" aria-labelledby="g04-criteria-title">
      <div className="g04CriteriaHeading">
        <p className="g04CriteriaEyebrow">PROPOSTA DA RIESAMINARE</p>
        <h3 id="g04-criteria-title">Quali criteri vuoi osservare?</h3>
        <p>
          Seleziona quelli pertinenti alla lezione. Sono suggerimenti pedagogici, non
          una rubrica approvata. Il riferimento al curricolo è ancora provvisorio.
        </p>
      </div>

      <fieldset className="g04CriteriaChoices">
        <legend>Criteri disponibili</legend>
        {proposal.criteria.map((criterion) => (
          <label key={criterion.id} className="g04CriterionChoice">
            <input
              type="checkbox"
              checked={selection.selectedIds.includes(criterion.id)}
              onChange={() => onToggle(criterion.id)}
            />
            <span>
              <strong>{criterion.title}</strong>
              <span>{criterion.description}</span>
              <small>Possibile evidenza: {criterion.evidence}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="g04CriterionActions">
        <button
          type="button"
          disabled={selection.selectedIds.length === 0 || confirmed}
          onClick={onConfirm}
        >
          {confirmed ? 'Scelta confermata' : 'Conferma la scelta'}
        </button>
        <p role="status" aria-live="polite">
          {confirmed
            ? `${selection.confirmedIds?.length ?? 0} criteri confermati solo per questa sessione.`
            : selection.selectedIds.length === 0
              ? 'Nessun criterio selezionato.'
              : `${selection.selectedIds.length} criteri selezionati, in attesa della tua conferma.`}
        </p>
      </div>

      <p className="g04CriteriaPrivacy">
        La scelta rimane soltanto in questa schermata, non viene salvata né inviata
        al Registro Docente. Non produce voti, osservazioni individuali o
        approvazioni del curricolo. Cambiando la scelta, la conferma precedente si annulla.
      </p>
      <details className="g04CriteriaRefs">
        <summary>Riferimenti e stato della proposta</summary>
        <p>
          Attività: {proposal.activityId} · UdA: {proposal.udaCode} ·
          Nucleo del curricolo locale: «{proposal.localMasterReference}».
          Master Arena 1.3 ancora non vigente; raccordo editoriale G03 di TRAMA.
        </p>
      </details>
    </section>
  )
}
