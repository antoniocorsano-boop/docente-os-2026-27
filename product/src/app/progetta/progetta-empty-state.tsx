import Link from 'next/link'

/**
 * Isolated read-only presentation for the empty authorized-class registry.
 * The route decides whether there are classes; this component does not query
 * or mutate professional data and can be verified with synthetic fixtures.
 */
export function ProgettaEmptyState({ hasAcademicYear }: { hasAcademicYear: boolean }) {
  return (
    <section className="progettaEntryEmpty" aria-labelledby="progetta-no-classes-title">
      {hasAcademicYear ? (
        <>
          <h2 id="progetta-no-classes-title">Nessuna classe disponibile</h2>
          <p>Definisci le classi nell&apos;anno scolastico corrente prima di avviare la progettazione contestuale.</p>
          <Link href="/impostazioni#classi">Configura le classi</Link>
        </>
      ) : (
        <>
          <h2 id="progetta-no-classes-title">Anno scolastico non disponibile</h2>
          <p>Non è presente un anno scolastico attivo nello spazio docente. La configurazione delle classi non è disponibile finché questo contesto non viene ripristinato.</p>
          <Link href="/planner">Torna a Oggi</Link>
        </>
      )}
    </section>
  )
}
