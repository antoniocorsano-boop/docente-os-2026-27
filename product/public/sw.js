const SHARE_CACHE = 'docente-os-share-intake-v1'
const SHARE_PREFIX = '/__share-intake/'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method === 'POST' && url.origin === self.location.origin && url.pathname === '/share-target') {
    event.respondWith(handleShareTarget(request))
  }
})

async function handleShareTarget(request) {
  const formData = await request.formData()
  const sharedFiles = collectSharedFiles(formData)
  const intakeId = crypto.randomUUID()
  const cache = await caches.open(SHARE_CACHE)

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
    receivedAt: new Date().toISOString(),
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
      },
    }),
  )

  return Response.redirect('/share-target?id=' + encodeURIComponent(intakeId), 303)
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
