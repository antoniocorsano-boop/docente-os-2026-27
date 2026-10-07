import type { TemplateBuilderViewModel } from './template-builder-model'

export function TemplateBuilder({ model }: { model: TemplateBuilderViewModel }) {
  return (
    <div className="templateBuilder">
      <section className="templateBuilderSummary" aria-labelledby="template-builder-title">
        <div>
          <p className="templateBuilderEyebrow">MODELLO DOCUMENTALE</p>
          <h1 id="template-builder-title">{model.title}</h1>
          <p>Rivedi struttura, forma e informazioni prima che il modello venga adottato nei documenti dell’istituto.</p>
        </div>
        <div className="templateBuilderStatus" aria-label="Stato del modello">
          <strong>{model.reviewLabel}</strong>
          <span>{model.statusLabel} · {model.sourceSummary}</span>
        </div>
      </section>

      <section className={`templateBuilderGate ${model.canApprove ? 'ready' : 'attention'}`} aria-live="polite">
        <div>
          <span>REVISIONE</span>
          <strong>{model.canApprove ? 'Pronto per approvazione umana' : 'Serve ancora una revisione'}</strong>
          <p>{model.canApprove
            ? 'La struttura è coerente e può essere sottoposta all’approvazione finale quando la versione sarà registrata.'
            : 'Correggi i rilievi prima di rendere il modello disponibile.'}</p>
        </div>
        {model.findings.length ? (
          <ul>{model.findings.map((finding) => <li key={finding}>{finding}</li>)}</ul>
        ) : <span className="templateBuilderPass">Nessun rilievo bloccante.</span>}
      </section>

      <div className="templateBuilderSections">
        {model.sections.map((section, index) => (
          <section className="templateBuilderSection" key={`${index}-${section.label}`}>
            <header>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h2>{section.label}</h2>
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
    </div>
  )
}
