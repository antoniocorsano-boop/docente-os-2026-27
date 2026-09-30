export type ShareIntakeCache = {
  keys(): Promise<readonly Request[]>
  delete(request: Request): Promise<boolean>
}

export async function clearShareIntakeStaging(
  cache: ShareIntakeCache,
  intakeId: string,
  sharePrefix = '/__share-intake/',
) {
  const keys = await cache.keys()
  const matches = keys.filter((request) =>
    new URL(request.url).pathname.startsWith(sharePrefix + intakeId + '/'),
  )
  const metadata = matches.filter((request) =>
    new URL(request.url).pathname.endsWith('/meta'),
  )
  const payloads = matches.filter((request) =>
    !new URL(request.url).pathname.endsWith('/meta'),
  )

  for (const request of payloads) {
    const deleted = await cache.delete(request)
    if (!deleted) {
      // Keep metadata resolvable so the intake can retry cleanup of an orphaned file.
      throw new Error('Share Target staging cleanup incomplete')
    }
  }

  for (const request of metadata) {
    const deleted = await cache.delete(request)
    if (!deleted) {
      throw new Error('Share Target staging cleanup incomplete')
    }
  }

  return matches.length
}
