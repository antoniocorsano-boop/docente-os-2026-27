export type ContentSecurityPolicyOptions = {
  nonce: string;
  isDevelopment: boolean;
  supabaseUrl?: string;
};

function parseOrigin(value?: string) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function toWebSocketOrigin(origin: string) {
  const url = new URL(origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.origin;
}

export function createContentSecurityPolicyNonce() {
  return crypto.randomUUID().replaceAll('-', '');
}

export function buildContentSecurityPolicy({
  nonce,
  isDevelopment,
  supabaseUrl,
}: ContentSecurityPolicyOptions) {
  const scriptSources = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (isDevelopment) scriptSources.push("'unsafe-eval'");

  const connectSources = ["'self'"];
  const imageSources = ["'self'", 'data:', 'blob:'];

  const supabaseOrigin = parseOrigin(supabaseUrl);
  if (supabaseOrigin) {
    connectSources.push(supabaseOrigin, toWebSocketOrigin(supabaseOrigin));
    imageSources.push(supabaseOrigin);
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "script-src-attr 'none'",
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    `img-src ${imageSources.join(' ')}`,
    "font-src 'self' data:",
    `connect-src ${connectSources.join(' ')}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
  ].join('; ');
}
