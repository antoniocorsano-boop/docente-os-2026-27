const modules = [
  ['Planner', 'Attività, priorità, scadenze e prossime azioni.'],
  ['Comunicazioni', 'Circolari, allegati, adempimenti e stato pratica.'],
  ['Documenti', 'Modelli, versioni, validazioni e riferimenti Drive.'],
  ['Calendario', 'Eventi reali e promemoria con integrazione Google Calendar.'],
  ['Didattica', 'Classi, UDA, lezioni, ore previste e ore svolte.'],
  ['Formazione', 'Corsi, iscrizioni, attestati e archivio annuale.'],
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">DOCENTE OS · PRODUCT FOUNDATION</p>
        <h1>Anno scolastico 2026/27</h1>
        <p className="lead">
          Una base prodotto modulare per trasformare comunicazioni, impegni, documenti e attività didattiche in workflow verificabili.
        </p>
        <div className="statusRow">
          <span className="badge">P0 FOUNDATION</span>
          <span className="muted">Prototipo v2.1 mantenuto come riferimento di migrazione.</span>
        </div>
      </section>

      <section className="moduleGrid" aria-label="Moduli previsti">
        {modules.map(([title, description]) => (
          <article className="card" key={title}>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
