import {
  mutateFamilyTemplateAction,
  mutateInstitutionalBaseAction,
} from './actions'
import type {
  GovernedTemplateBuilderViewModel,
  TemplateBuilderHistoryEntry,
  TemplateBuilderLifecycleAction,
} from './template-builder-model'

type LifecycleServerAction = (formData: FormData) => Promise<void>

function GovernanceControls({
  actions,
  identityId,
  currentVersionNo,
  serverAction,
}: {
  actions: TemplateBuilderLifecycleAction[]
  identityId: string | null
  currentVersionNo: number | null
  serverAction: LifecycleServerAction
}) {
  if (!actions.length || !identityId || currentVersionNo === null) return null

  return (
    <div className="templateBuilderGovernance" aria-label="Azioni di governo del modello">
      {actions.map((item) => (
        <form action={serverAction} key={item.key} className="templateBuilderGovernanceAction">
          <input type="hidden" name="identityId" value={identityId} />
          <input type="hidden" name="currentVersionNo" value={String(currentVersionNo)} />
          <input type="hidden" name="lifecycleAction" value={item.key} />
          {item.key === 'ACTIVATE' ? (
            <label className="templateBuilderConfirmation">
              <input type="checkbox" name="humanReviewConfirmed" required />
              Confermo di aver riesaminato questa versione prima dell’attivazione.
            </label>
          ) : (
            <label>
              Nota della decisione
              <input
                type="text"
                name="note"
                required
                minLength={3}
                placeholder="Motivo della decisione"
              />
            </label>
          )}
          <button type="submit">{item.label}</button>
        </form>
      ))}
    </div>
  )
}

function ReviewGate({
  reviewAvailable,
  reviewLabel,
  findings,
}: {
  reviewAvailable: boolean
  reviewLabel: string
  findings: string[]
}) {
  const ready = reviewAvailable && !findings.length && /superato/i.test(reviewLabel)
  return (
    <section className={`templateBuilderGate ${ready ? 'ready' : 'attention'}`} aria-live="polite">
      <div>
        <span>REVISIONE</span>
        <strong>{reviewLabel}</strong>
        <p>{!reviewAvailable
          ? 'Il controllo qualità deve ancora essere eseguito per questa versione.'
          : ready
            ? 'La versione corrente non presenta rilievi bloccanti.'
            : 'Verifica i rilievi prima di rendere disponibile questa versione.'}</p>
      </div>
      {!reviewAvailable ? (
        <span>In attesa del controllo qualità.</span>
      ) : findings.length ? (
        <ul>{findings.map((finding) => <li key={finding}>{finding}</li>)}</ul>
      ) : <span className="templateBuilderPass">Nessun rilievo bloccante.</span>}
    </section>
  )
}

function VersionHistory({ history }: { history: TemplateBuilderHistoryEntry[] }) {
  if (!history.length) return null

  return (
    <details className="templateBuilderHistory">
      <summary>Versioni registrate</summary>
      <ul>
        {history.map((entry) => {
          const state = [
            entry.current ? 'Corrente' : null,
            entry.active ? 'In uso' : null,
            entry.reviewLabel,
          ].filter(Boolean).join(' · ')

          return (
            <li key={entry.versionNo}>
              <strong>Versione {entry.versionNo}</strong>
              <span>{state}</span>
            </li>
          )
        })}
      </ul>
    </details>
  )
}

export function TemplateBuilder({ model }: { model: GovernedTemplateBuilderViewModel }) {
  return (
    <div className="templateBuilder">
      <section className="templateBuilderSummary" aria-labelledby="template-builder-title">
        <div>
          <p className="templateBuilderEyebrow">MODELLI ISTITUZIONALI</p>
          <h1 id="template-builder-title">Veste e modelli dei documenti</h1>
          <p>
            La veste comune dell’istituto e la struttura dei singoli documenti restano separate,
            versionate e revisionabili in modo indipendente.
          </p>
        </div>
        <div className="templateBuilderStatus" aria-label="Autorità disponibile">
          <strong>{model.canGovern ? 'Governo dei modelli disponibile' : 'Consultazione'}</strong>
          <span>{model.canGovern
            ? 'Le decisioni restano soggette ai controlli di autorità del sistema.'
            : 'Le decisioni istituzionali sono riservate a responsabili autorizzati.'}</span>
        </div>
      </section>

      <section className="templateBuilderStream" aria-labelledby="institutional-base-heading">
        <header className="templateBuilderStreamHeader">
          <div>
            <p className="templateBuilderEyebrow">{model.institutionalBase.heading.toUpperCase()}</p>
            <h2 id="institutional-base-heading">{model.institutionalBase.title}</h2>
            <p>{model.institutionalBase.institutionName
              ?? 'Registra una veste istituzionale per governare intestazione, tipografia, geometria, tabelle e firma comuni.'}</p>
          </div>
          <div className="templateBuilderStatus">
            <strong>{model.institutionalBase.reviewLabel}</strong>
            <span>{model.institutionalBase.statusLabel} · {model.institutionalBase.sourceSummary}</span>
          </div>
        </header>
        <ReviewGate
          reviewAvailable={model.institutionalBase.reviewAvailable}
          reviewLabel={model.institutionalBase.reviewLabel}
          findings={model.institutionalBase.findings}
        />
        <GovernanceControls
          actions={model.institutionalBase.actions}
          identityId={model.institutionalBase.identityId}
          currentVersionNo={model.institutionalBase.currentVersionNo}
          serverAction={mutateInstitutionalBaseAction}
        />
        <VersionHistory history={model.institutionalBase.history} />
      </section>

      <section className="templateBuilderStream" aria-labelledby="family-template-heading">
        <header className="templateBuilderStreamHeader">
          <div>
            <p className="templateBuilderEyebrow">{model.familyTemplate.heading.toUpperCase()}</p>
            <h2 id="family-template-heading">{model.familyTemplate.title}</h2>
            <p>Definisce sezioni e informazioni proprie di questa famiglia documentale, senza ridefinire la veste comune.</p>
          </div>
          <div className="templateBuilderStatus">
            <strong>{model.familyTemplate.reviewLabel}</strong>
            <span>{model.familyTemplate.statusLabel} · {model.familyTemplate.sourceSummary}</span>
          </div>
        </header>
        <ReviewGate
          reviewAvailable={model.familyTemplate.reviewAvailable}
          reviewLabel={model.familyTemplate.reviewLabel}
          findings={model.familyTemplate.findings}
        />
        <GovernanceControls
          actions={model.familyTemplate.actions}
          identityId={model.familyTemplate.identityId}
          currentVersionNo={model.familyTemplate.currentVersionNo}
          serverAction={mutateFamilyTemplateAction}
        />
        <VersionHistory history={model.familyTemplate.history} />

        <div className="templateBuilderSections">
          {model.familyTemplate.sections.map((section, index) => (
            <section className="templateBuilderSection" key={`${index}-${section.label}`}>
              <header>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{section.label}</h3>
                  <p>{section.purpose}</p>
                </div>
                <div className="templateBuilderBadges">
                  <span>{section.renderRoleLabel}</span>
                  <span>{section.requiredLabel}</span>
                </div>
              </header>

              <div className="templateBuilderFields">
                {section.fields.map((field) => (
                  <article key={field.label}>
                    <strong>{field.label}</strong>
                    <span>{field.requiredLabel}</span>
                    <small>{field.valuePolicyLabel}</small>
                  </article>
                ))}
              </div>

              <details className="templateBuilderAdvanced">
                <summary>Controlli del modello</summary>
                <div>
                  <p><strong>Scelte strutturali disponibili</strong></p>
                  <ul>{section.availableDecisions.map((decision) => <li key={decision}>{decision}</li>)}</ul>
                  <p><strong>Trattamento delle informazioni</strong></p>
                  <ul>{section.fields.map((field) => <li key={`${field.label}-privacy`}>{field.label}: {field.privacyLabel}</li>)}</ul>
                </div>
              </details>
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}
