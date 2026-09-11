import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const VERSION = 'v1'

export function encryptGoogleToken(plainText: string) {
  if (!plainText) throw new Error('Google token required')
  const key = encryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.')
}

export function decryptGoogleToken(value: string) {
  const [version, ivEncoded, tagEncoded, encryptedEncoded] = value.split('.')
  if (version !== VERSION || !ivEncoded || !tagEncoded || !encryptedEncoded) throw new Error('Invalid encrypted Google token')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivEncoded, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
    decipher.final(),
  ])
  return plain.toString('utf8')
}

function encryptionKey() {
  const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
  if (!raw) throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY is not configured')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as base64')
  return key
}
