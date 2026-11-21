import { assertArenaReleaseDigest, TRUSTED_ARENA_2026_RELEASE_SHA256, TRUSTED_ARENA_2026_MAX_BYTES } from '@/core/domain/cml-provisional-arena-blob'

// The additional OAuth scope is requested only for personal Arena consultation.
export const GOOGLE_ARENA_DRIVE_READ_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

// Exact private, owner-only archival copy. A file ID is never an authorization.
const ARENA_PRIVATE_DRIVE_FILE_ID = '1r6CUQ0ziNEHSnttJ7tgeoOCkUZpOQg6-'
export const ARENA_PRIVATE_DRIVE_SOURCE_URL =
  `https://www.googleapis.com/drive/v3/files/${ARENA_PRIVATE_DRIVE_FILE_ID}?alt=media`
export const ARENA_PRIVATE_RELEASE_LENGTH = 725968

export async function downloadPinnedArenaFromDrive(
  accessToken: string,
  http: typeof fetch = fetch,
): Promise<Uint8Array> {
  if (!accessToken || /\s/.test(accessToken)) throw new Error('Google access token missing')
  const response = await http(ARENA_PRIVATE_DRIVE_SOURCE_URL, {
    method: 'GET',
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Private Arena Drive source unavailable: ${response.status}`)
  const declaredLength = response.headers.get('content-length')
  if (declaredLength && Number(declaredLength) > TRUSTED_ARENA_2026_MAX_BYTES) {
    throw new Error('Arena Drive source exceeds the permitted size')
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength !== ARENA_PRIVATE_RELEASE_LENGTH) throw new Error('Arena Drive source byte length mismatch')
  assertArenaReleaseDigest(bytes, TRUSTED_ARENA_2026_RELEASE_SHA256)
  return bytes
}
