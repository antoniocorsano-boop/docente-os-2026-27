function firstForwardedValue(value: string | null) {
  return value?.split(',')[0]?.trim() || null
}

function safeOrigin(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null
  } catch {
    return null
  }
}

function safeUrl(value: string) {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

export function resolvePublicRequestOrigin(
  request: Pick<Request, 'url' | 'headers'>,
  configuredOrigin = process.env.NEXT_PUBLIC_APP_URL ?? null,
) {
  const requestUrl = safeUrl(request.url)
  const forwardedHost = firstForwardedValue(request.headers.get('x-forwarded-host'))
  const forwardedProtocol = firstForwardedValue(request.headers.get('x-forwarded-proto'))

  if (forwardedHost) {
    const protocol = forwardedProtocol ?? requestUrl?.protocol.replace(':', '') ?? 'https'
    const proxyOrigin = safeOrigin(`${protocol}://${forwardedHost}`)
    if (proxyOrigin) return proxyOrigin
  }

  const configured = safeOrigin(configuredOrigin)
  if (configured) return configured

  const host = firstForwardedValue(request.headers.get('host'))
  if (host) {
    const protocol = requestUrl?.protocol.replace(':', '') ?? 'https'
    const hostOrigin = safeOrigin(`${protocol}://${host}`)
    if (hostOrigin) return hostOrigin
  }

  if (requestUrl) return requestUrl.origin

  throw new Error('Unable to resolve public request origin')
}

export function publicRequestUrl(path: string, request: Pick<Request, 'url' | 'headers'>) {
  return new URL(path, resolvePublicRequestOrigin(request))
}
