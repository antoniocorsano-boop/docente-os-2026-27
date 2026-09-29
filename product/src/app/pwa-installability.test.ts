import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const manifestSource = fs.readFileSync(new URL('./manifest.ts', import.meta.url), 'utf8')
const installPromptSource = fs.readFileSync(new URL('../components/pwa/PwaInstallPrompt.tsx', import.meta.url), 'utf8')

function pngDimensions(path: string) {
  const png = fs.readFileSync(new URL(path, import.meta.url))
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  }
}

test('PWA manifest exposes Chromium installability icon sizes', () => {
  assert.match(manifestSource, /\/pwa\/icon-192\.png/)
  assert.match(manifestSource, /sizes: '192x192'/)
  assert.match(manifestSource, /\/pwa\/icon-512\.png/)
  assert.match(manifestSource, /sizes: '512x512'/)
  assert.match(manifestSource, /\/pwa\/icon-maskable-512\.png/)
  assert.match(manifestSource, /purpose: 'maskable'/)
  assert.match(manifestSource, /prefer_related_applications: false/)

  assert.deepEqual(pngDimensions('../../../public/pwa/icon-192.png'), { width: 192, height: 192 })
  assert.deepEqual(pngDimensions('../../../public/pwa/icon-512.png'), { width: 512, height: 512 })
  assert.deepEqual(pngDimensions('../../../public/pwa/icon-maskable-512.png'), { width: 512, height: 512 })
})

test('PWA exposes an explicit install path and a browser fallback', () => {
  assert.match(installPromptSource, /beforeinstallprompt/)
  assert.match(installPromptSource, /appinstalled/)
  assert.match(installPromptSource, /display-mode: standalone/)
  assert.match(installPromptSource, /Installa app/)
  assert.match(installPromptSource, /Aggiungi a schermata Home/)
})

test('Share Target accepts MIME types and file extensions', () => {
  for (const token of [
    "'application/pdf'",
    "'.pdf'",
    "'application/vnd.openxmlformats-officedocument.wordprocessingml.document'",
    "'.docx'",
    "'image/jpeg'",
    "'.jpg'",
    "'.jpeg'",
  ]) {
    assert.ok(manifestSource.includes(token), `missing Share Target accept token: ${token}`)
  }
})
