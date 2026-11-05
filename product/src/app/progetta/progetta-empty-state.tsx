import Link from 'next/link'

/**
 * Isolated read-only presentation for the empty authorized-class registry.
 * The route decides whether there are classes; this component does not query
 * or mutate professional data and can be verified with synthetic fixtures.
 */
export function ProgettaEmptyState({ hasAcademicYear }: { hasAcademicYear: boolean }) {
  return (
    <section className="progettaEntryEmpty" aria-labelledby="progetta-no-classes-title">
      <h2 id="progetta-no-classes-title">Nessuna classe disponibile</h2>
      <p>Definisci le classi nell&apos;anno scolastico corrente prima di avviare la progettazione contestuale.</p>
      <Link href={hasAcademicYear ? '/impostazioni#classi' : '/workspace'}>Configura le classi</Link>
    </section>
  )
}
