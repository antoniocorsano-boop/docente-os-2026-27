import crypto from 'node:crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateTotp(secret, nowMs = Date.now()) {
  const key = decodeBase32(secret)
  const counter = BigInt(Math.floor(nowMs / 1000 / 30))
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64BE(counter)

  const digest = crypto.createHmac('sha1', key).update(buffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)

  return String(binary % 1_000_000).padStart(6, '0')
}

export function generateDefinitelyInvalidTotp(secret, nowMs = Date.now()) {
  const acceptedWindow = new Set([
    generateTotp(secret, nowMs - 30_000),
    generateTotp(secret, nowMs),
    generateTotp(secret, nowMs + 30_000),
  ])

  for (let candidate = 0; candidate < 1_000_000; candidate += 1) {
    const code = String(candidate).padStart(6, '0')
    if (!acceptedWindow.has(code)) return code
  }

  throw new Error('Unable to construct an invalid TOTP code')
}

export function millisecondsUntilNextTotpStep(nowMs = Date.now()) {
  const stepMs = 30_000
  return stepMs - (nowMs % stepMs)
}

function decodeBase32(value) {
  const normalized = value.toUpperCase().replace(/[\s=-]/g, '')
  if (!normalized) throw new Error('TOTP secret is empty')

  let bits = 0
  let bitCount = 0
  const bytes = []

  for (const character of normalized) {
    const digit = BASE32_ALPHABET.indexOf(character)
    if (digit < 0) throw new Error(`Invalid Base32 character in TOTP secret: ${character}`)

    bits = (bits << 5) | digit
    bitCount += 5

    while (bitCount >= 8) {
      bitCount -= 8
      bytes.push((bits >> bitCount) & 0xff)
      bits &= (1 << bitCount) - 1
    }
  }

  if (bytes.length === 0) throw new Error('TOTP secret decoded to an empty key')
  return Buffer.from(bytes)
}
