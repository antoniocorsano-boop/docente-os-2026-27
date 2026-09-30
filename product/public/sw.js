const SHARE_CACHE = 'docente-os-share-intake-v1'
const SHARE_PREFIX = '/__share-intake/'
const SHARE_MAX_AGE_MS = 60 * 60 * 1000
let lastSweepAt = 0

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim()
    await sweepExpiredShareIntakes(true)
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  event.waitUntil(sweepExpiredShareIntakes(false))

  if (request.method === 'POST' && url.origin === self.location.origin && url.pathname === '/share-target') {
    event.respondWith(handleShareTarget(request))
  }
})

async function handleShareTarget(request) {
  const formData = await request.formData()
  const sharedFiles = collectSharedFiles(formData)
  const intakeId = crypto.randomUUID()
  const cache = await caches.open(SHARE_CACHE)
  const stagedAt = new Date().toISOString()

  const files = []
  for (let index = 0; index < sharedFiles.length; index += 1) {
    const file = sharedFiles[index]
    const key = SHARE_PREFIX + intakeId + '/file/' + index
    await cache.put(
      key,
      new Response(file, {
        headers: {
          'content-type': file.type || 'application/octet-stream',
          'cache-control': 'no-store',
          'x-docente-os-staged-at': stagedAt,
        },
      }),
    )
    files.push({
      index,
      name: file.name || ('condiviso-' + (index + 1)),
      type: file.type || 'application/octet-stream',
      size: file.size,
    })
  }

  const metadata = {
    id: intakeId,
    receivedAt: stagedAt,
    title: String(formData.get('title') || ''),
    text: String(formData.get('text') || ''),
    url: String(formData.get('url') || ''),
    files,
  }

  await cache.put(
    SHARE_PREFIX + intakeId + '/meta',
    new Response(JSON.stringify(metadata), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-docente-os-staged-at': stagedAt,
      },
    }),
  )

  return Response.redirect('/share-target?id=' + encodeURIComponent(intakeId), 303)
}

async function sweepExpiredShareIntakes(force) {
  const now = Date.now()
  if (!force && now - lastSweepAt < 60 * 1000) return
  lastSweepAt = now

  const cache = await caches.open(SHARE_CACHE)
  const keys = await cache.keys()
  const intakeIds = new Set()

  for (const request of keys) {
    const pathname = new URL(request.url).pathname
    if (!pathname.startsWith(SHARE_PREFIX)) continue
    const rest = pathname.slice(SHARE_PREFIX.length)
    const intakeId = rest.split('/')[0]
    if (intakeId) intakeIds.add(intakeId)
  }

  for (const intakeId of intakeIds) {
    const metaKey = SHARE_PREFIX + intakeId + '/meta'
    const metaResponse = await cache.match(metaKey)
    let stagedAt = null

    if (metaResponse) {
      try {
        const metadata = await metaResponse.clone().json()
        stagedAt = Date.parse(String(metadata.receivedAt || ''))
      } catch {
        stagedAt = null
      }
    } else {
      const intakeKeys = keys.filter((request) =>
        new URL(request.url).pathname.startsWith(SHARE_PREFIX + intakeId + '/'),
      )
      for (const request of intakeKeys) {
        const response = await cache.match(request)
        const header = response?.headers.get('x-docente-os-staged-at')
        if (header) {
          stagedAt = Date.parse(header)
          if (Number.isFinite(stagedAt)) break
        }
      }
    }

    const expired = !Number.isFinite(stagedAt) || now - stagedAt >= SHARE_MAX_AGE_MS
    if (expired) {
      await clearCachedIntake(cache, intakeId)
    }
  }
}

async function clearCachedIntake(cache, intakeId) {
  const keys = await cache.keys()
  const matches = keys.filter((request) =>
    new URL(request.url).pathname.startsWith(SHARE_PREFIX + intakeId + '/'),
  )
  const metadata = matches.filter((request) =>
    new URL(request.url).pathname.endsWith('/meta'),
  )
  const payloads = matches.filter((request) =>
    !new URL(request.url).pathname.endsWith('/meta'),
  )

  for (const request of payloads) {
    const deleted = await cache.delete(request)
    if (!deleted) throw new Error('Share Target staging cleanup incomplete')
  }
  for (const request of metadata) {
    const deleted = await cache.delete(request)
    if (!deleted) throw new Error('Share Target staging cleanup incomplete')
  }
}

function collectSharedFiles(formData) {
  const preferred = formData.getAll('files').filter(isFileLike)
  const allFileLike = []

  for (const [, value] of formData.entries()) {
    if (!isFileLike(value)) continue
    if (!allFileLike.includes(value)) allFileLike.push(value)
  }

  if (!preferred.length) return allFileLike

  for (const value of allFileLike) {
    if (!preferred.includes(value)) preferred.push(value)
  }
  return preferred
}

function isFileLike(value) {
  return Boolean(
    value
      && typeof value !== 'string'
      && typeof value.size === 'number'
      && value.size > 0
      && typeof value.arrayBuffer === 'function'
  )
}
