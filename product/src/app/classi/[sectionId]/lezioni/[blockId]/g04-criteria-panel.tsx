'use client'

import type { G04Proposal, G04SessionSelection } from '@/core/presentation/curr-ref-g04-criteria'
import { isG04SessionConfirmed } from '@/core/presentation/curr-ref-g04-criteria'

type Props = {
  proposal: G04Proposal
  selection: G04SessionSelection
  onToggle: (id: string) => void
  onConfirm: () => void
}

/**
 * G04 — compact teacher-facing proposal.
 * Only the display is condensed: the two fully sourced criteria stay intact.
 * The control is local to the page and has NO persistence or assessment authority.
 */
export default function G04CriteriaPanel({
  proposal,
  selection,
  onToggle,
  onConfirm,
}: Props) {
  const confirmed = isG04SessionConfirmed(selection)
  return (
    <section className="g04CriteriaPanel" aria-labelledby="g04-criteria-title">
      <header className="g04CriteriaHeading">
        <p className="g04CriteriaEyebrow">PROPOSTA DIDATTICA</p>
        <h3 id="g04-criteria-title">Cosa vuoi osservare?</h3>
        <p>Seleziona i criteri pertinenti e conferma la scelta.</p>
      </header>

      <fieldset className="g04CriteriaChoices">
        <legend className="g04VisuallyHidden">Criteri proposti per la lezione</legend>
        {proposal.criteria.map((criterion) => (
          <div key={criterion.id} className="g04CriterionItem">
            <label className="g04CriterionChoice">
              <input
                type="checkbox"
                checked={selection.selectedIds.includes(criterion.id)}
                onChange={() => onToggle(criterion.id)}
              />
              <strong>{criterion.title}</strong>
            </label>
            <details className="g04CriterionEvidence">
              <summary>Descrizione ed evidenza</summary>
              <p>{criterion.description}</p>
              <p><strong>Evidenza attesa:</strong> {criterion.evidence}</p>
            </details>
          </div>
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
        <p role="status" aria-live="polite" aria-atomic="true">
          {confirmed
            ? `${selection.confirmedIds?.length ?? 0} ${selection.confirmedIds?.length === 1 ? 'criterio confermato' : 'criteri confermati'} solo per questa sessione.`
            : selection.selectedIds.length === 0
              ? 'Nessun criterio selezionato.'
              : `${selection.selectedIds.length} criteri selezionati, in attesa della tua conferma.`}
        </p>
      </div>

      <p className="g04CriteriaPrivacy">
        Solo in questa pagina: nessun salvataggio, voto o invio al Registro.
      </p>

      <details className="g04CriteriaRefs">
        <summary>Fonte, limiti e riferimenti</summary>
        <p>
          Riferimento curricolare locale proposto: «{proposal.localMasterReference}»
          (competenza candidata). Master Arena 1.3 non vigente.
          Criteri da riesaminare: la conferma temporanea non equivale
          ad approvazione della valutazione.
        </p>
        <p>
          Attività: {proposal.activityId} · UdA: {proposal.udaCode} ·
          raccordo editoriale G03 di TRAMA.
        </p>
      </details>
    </section>
  )
}
