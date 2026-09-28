export const TIMETABLE_DRAFT_REVISION_TOKEN_VERSION = 'TTDR-1' as const

export type TimetableDraftRevisionSource = Readonly<{
  versionId: string
  revision: number
}>

export type TimetableDraftRevisionToken =
  | Readonly<{
      contractVersion: typeof TIMETABLE_DRAFT_REVISION_TOKEN_VERSION
      state: 'TOKEN_READY'
      token: string
      versionId: string
      revision: number
    }>
  | Readonly<{
      contractVersion: typeof TIMETABLE_DRAFT_REVISION_TOKEN_VERSION
      state: 'BLOCKED'
      reason: 'INVALID_VERSION_ID' | 'INVALID_REVISION'
    }>

/**
 * Materializes the opaque G1.6 revision token from a DB-authoritative DRAFT
 * version identity and its DB-enforced monotonic revision counter.
 *
 * This function does not read the database and does not prove that the supplied
 * source is current. Authority comes only from the transactionally observed DB
 * snapshot supplied by a future boundary.
 */
export function materializeTimetableDraftRevisionToken(
  source: TimetableDraftRevisionSource,
): TimetableDraftRevisionToken {
  const versionId = source.versionId.trim()
  if (versionId.length === 0) return blocked('INVALID_VERSION_ID')
  if (!Number.isSafeInteger(source.revision) || source.revision < 0) {
    return blocked('INVALID_REVISION')
  }

  return {
    contractVersion: TIMETABLE_DRAFT_REVISION_TOKEN_VERSION,
    state: 'TOKEN_READY',
    token: `${TIMETABLE_DRAFT_REVISION_TOKEN_VERSION}|${encodeSequence([
      versionId,
      String(source.revision),
    ])}`,
    versionId,
    revision: source.revision,
  }
}

function blocked(
  reason: Extract<TimetableDraftRevisionToken, { state: 'BLOCKED' }>['reason'],
): TimetableDraftRevisionToken {
  return {
    contractVersion: TIMETABLE_DRAFT_REVISION_TOKEN_VERSION,
    state: 'BLOCKED',
    reason,
  }
}

function encodeSequence(values: readonly string[]): string {
  return values.map((value) => `${value.length}:${value}`).join('|')
}
