import { resolveTextbookSupportForUdaCode } from '@/core/presentation/human-task-textbook-provenance'

export type ProgettaTextbookSupportView = {
  priority: 'secondary'
  heading: 'Supporto dal libro adottato'
  bookLabel: string
  stateLabel:
    | 'Pagine verificate'
    | 'Dettagli da verificare'
    | 'Copertura parziale'
    | 'Fonte complementare necessaria'
  chapterLabel: string | null
  pageLabel: string | null
  description: string
}

function formatPageRanges(ranges: Array<{ from: number; to: number }>) {
  if (!ranges.length) return null
  return `pp. ${ranges.map(({ from, to }) => (from === to ? String(from) : `${from}–${to}`)).join(', ')}`
}

export function buildProgettaTextbookSupport(
  udaCode: string,
): ProgettaTextbookSupportView | null {
  const provenance = resolveTextbookSupportForUdaCode(udaCode)
  if (!provenance) return null

  const common = {
    priority: 'secondary' as const,
    heading: 'Supporto dal libro adottato' as const,
    bookLabel: `${provenance.textbook.title} · ${provenance.textbook.configuration}`,
    chapterLabel: provenance.chapterLabel,
    pageLabel: formatPageRanges(provenance.pageRanges),
    description: provenance.message,
  }

  if (provenance.status === 'VERIFIED_PAGES') {
    return { ...common, stateLabel: 'Pagine verificate' }
  }
  if (provenance.status === 'PARTIAL_GAP') {
    return {
      ...common,
      chapterLabel: null,
      pageLabel: null,
      stateLabel: 'Copertura parziale',
    }
  }
  if (provenance.status === 'STRUCTURAL_GAP') {
    return {
      ...common,
      chapterLabel: null,
      pageLabel: null,
      stateLabel: 'Fonte complementare necessaria',
    }
  }

  return {
    ...common,
    chapterLabel: null,
    pageLabel: null,
    stateLabel: 'Dettagli da verificare',
  }
}
