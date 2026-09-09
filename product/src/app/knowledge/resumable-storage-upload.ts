const TUS_VERSION = '1.0.0'
export const KNOWLEDGE_TUS_CHUNK_BYTES = 6 * 1024 * 1024
const RETRY_DELAYS_MS = [0, 1500, 3000, 5000, 10_000] as const

type ResumableUploadInput = {
  endpoint: string
  token: string
  bucketName: string
  objectPath: string
  mimeType: string
  file: Blob
  onProgress?: (uploadedBytes: number, totalBytes: number) => void
}

type FetchLike = typeof fetch

export async function uploadKnowledgeBlobResumable(
  input: ResumableUploadInput,
  fetcher: FetchLike = fetch,
): Promise<void> {
  if (!input.file.size) throw new Error('resumable_upload_empty_file')

  const uploadUrl = await createUpload(input, fetcher)
  let offset = 0
  input.onProgress?.(0, input.file.size)

  while (offset < input.file.size) {
    const chunkEnd = Math.min(offset + KNOWLEDGE_TUS_CHUNK_BYTES, input.file.size)
    offset = await patchChunk({ ...input, uploadUrl, offset, chunkEnd }, fetcher)
    input.onProgress?.(offset, input.file.size)
  }
}

async function createUpload(input: ResumableUploadInput, fetcher: FetchLike) {
  const headers = authorizedTusHeaders(input.token)
  headers.set('Upload-Length', String(input.file.size))
  headers.set('Upload-Metadata', [
    metadata('bucketName', input.bucketName),
    metadata('objectName', input.objectPath),
    metadata('contentType', input.mimeType),
    metadata('cacheControl', '3600'),
  ].join(','))
  headers.set('x-upsert', 'false')

  let lastError: unknown = null
  for (const delayMs of RETRY_DELAYS_MS) {
    if (delayMs) await delay(delayMs)
    try {
      const response = await fetcher(input.endpoint, { method: 'POST', headers })
      if (!response.ok) {
        lastError = new Error(`resumable_create_${response.status}`)
        if (!retryableStatus(response.status)) break
        continue
      }
      const location = response.headers.get('location')
      if (!location) throw new Error('resumable_create_missing_location')
      return new URL(location, input.endpoint).toString()
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('resumable_create_failed')
}

async function patchChunk(
  input: ResumableUploadInput & { uploadUrl: string; offset: number; chunkEnd: number },
  fetcher: FetchLike,
) {
  let expectedOffset = input.offset
  let lastError: unknown = null

  for (const delayMs of RETRY_DELAYS_MS) {
    if (delayMs) await delay(delayMs)
    try {
      const headers = authorizedTusHeaders(input.token)
      headers.set('Upload-Offset', String(expectedOffset))
      headers.set('Content-Type', 'application/offset+octet-stream')
      const response = await fetcher(input.uploadUrl, {
        method: 'PATCH',
        headers,
        body: input.file.slice(expectedOffset, input.chunkEnd),
      })

      if (response.ok) {
        const nextOffset = parseOffset(response.headers.get('upload-offset'))
        if (nextOffset === null || nextOffset <= expectedOffset || nextOffset > input.file.size) {
          throw new Error('resumable_patch_invalid_offset')
        }
        return nextOffset
      }

      lastError = new Error(`resumable_patch_${response.status}`)
      if (!retryableStatus(response.status)) break
    } catch (error) {
      lastError = error
    }

    const recoveredOffset = await recoverOffset(input.uploadUrl, input.token, fetcher)
    if (recoveredOffset !== null) {
      if (recoveredOffset >= input.chunkEnd) return recoveredOffset
      if (recoveredOffset >= input.offset && recoveredOffset < input.chunkEnd) expectedOffset = recoveredOffset
    }
  }

  throw lastError instanceof Error ? lastError : new Error('resumable_patch_failed')
}

async function recoverOffset(uploadUrl: string, token: string, fetcher: FetchLike) {
  try {
    const response = await fetcher(uploadUrl, { method: 'HEAD', headers: authorizedTusHeaders(token) })
    if (!response.ok) return null
    return parseOffset(response.headers.get('upload-offset'))
  } catch {
    return null
  }
}

function authorizedTusHeaders(token: string) {
  const headers = new Headers()
  headers.set('Tus-Resumable', TUS_VERSION)
  headers.set('Authorization', `Bearer ${token}`)
  return headers
}

function metadata(key: string, value: string) {
  return `${key} ${base64Utf8(value)}`
}

function base64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function parseOffset(value: string | null) {
  if (value === null || !/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function retryableStatus(status: number) {
  return status === 408 || status === 409 || status === 423 || status === 425 || status === 429 || status >= 500
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
