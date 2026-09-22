export const HTTP_MUTATION = /(fetch\s*\([^)]*,\s*\{[\s\S]{0,800}?method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]|axios\.(?:post|put|patch|delete)\s*\()/i
export const DATA_MUTATION = /(\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(|\.record\s*\(|\.persist\s*\(|localStorage\.setItem\s*\(|sessionStorage\.setItem\s*\(|indexedDB[\s\S]{0,300}?\.(?:add|put|delete|clear)\s*\()/i
export const NAMED_MUTATION = /\b(?:save|publish|approve|confirm|remove|delete|accept|dismiss|withdraw|attach|adopt|record|persist)[A-Z_a-z0-9]*\s*\(/i
export const EXPLICIT_WRITE = /@trama-write\b/i
export const EXPLICIT_READ_ONLY = /@trama-readonly\b/i
export const UI_FEEDBACK = /(aria-live|role=["']status["']|role=["']alert["']|Toast|toast\s*\(|@trama-feedback\b)/i
export const FEEDBACK_ASSERTION = /(getByRole\s*\(\s*['"](?:status|alert)['"]|findByRole\s*\(\s*['"](?:status|alert)['"]|@trama-feedback-test\b)/i
export const PERSISTENT_FEEDBACK = /(aria-live|role=["']status["']|role=["']alert["']|@trama-persistent-feedback\b)/i

export function isMutationCandidate(text, path = '') {
  if (EXPLICIT_READ_ONLY.test(text)) return false
  if (/(^|\/)(?:__tests__|test|tests|scripts|tools)(\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path)) return false
  if (HTTP_MUTATION.test(text) || DATA_MUTATION.test(text) || EXPLICIT_WRITE.test(text)) return true
  const namedBoundary = /(?:^|\/)(?:actions?|handlers?|hooks?|repositories?|commands?)(?:[./-]|$)/i.test(path)
    || /(?:Action|Handler|Repository|Command)\.[cm]?[jt]sx?$/.test(path)
  return namedBoundary && NAMED_MUTATION.test(text)
}

export function globToRegExp(glob) {
  let out = ''
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i]
    if (ch === '*' && glob[i + 1] === '*') { out += '.*'; i += 1; continue }
    if (ch === '*') { out += '[^/]*'; continue }
    if ('\\.^$+?()[]{}|'.includes(ch)) out += '\\' + ch
    else out += ch
  }
  return new RegExp('^' + out + '$')
}

export function matchesPattern(pattern,path) {
  return globToRegExp(pattern).test(path)
}
