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
  const results = await Promise.all(matches.map((request) => cache.delete(request)))
  if (results.some((deleted) => !deleted)) {
    throw new Error('Share Target staging cleanup incomplete')
  }
  return matches.length
}
