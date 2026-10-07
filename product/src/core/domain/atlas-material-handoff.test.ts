import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildStudioAtlasMaterialHref,
  decodeAtlasMaterialBundle,
  encodeTeachingContext,
  parseAtlasMaterialBundle,
  type TeachingContextSnapshot,
} from './atlas-material-handoff'

const context: TeachingContextSnapshot = {
  schema: 'docente-os.teaching-context/v0.1',
  source: 'docente-os',
  udaId: '2-01',
  udaTitle: 'Agricoltura come sistema tecnologico',
  grade: 'seconda',
  sectionId: 'section-2c',
  sectionLabel: '2C',
  discipline: 'Tecnologia',
  blockId: 'B11',
  packId: 'CAN-PACK-2A',
  period: 'Ottobre',
  returnUrl: 'https://docente-os-2026-27-beta.onrender.com/progetta/atlas/ritorno',
}

const validBundle = {
  schema: 'studio-atlas.material-bundle/v0.1',
  source: 'studio-atlas',
  bundleId: 'bundle-2-01',
  sourceUdaId: '2-01',
  generatedAt: '2026-10-07T08:00:00.000Z',
  items: [{ materialId: 'slides', type: 'presentation', title: 'Presentazione', description: 'Avvio UDA', origin: 'atlas' }],
}

test('builds an Atlas material URL without placing teaching context in query parameters', () => {
  const href = buildStudioAtlasMaterialHref('https://studio-atlas.example', context)
  const url = new URL(href)
  assert.equal(url.origin, 'https://studio-atlas.example')
  assert.equal(url.pathname, '/materiali')
  assert.equal(url.search, '')
  assert.match(url.hash, /^#context=/)
  assert.ok(!href.includes('Agricoltura'))
})

test('teaching context is base64url encoded as a versioned envelope', () => {
  const encoded = encodeTeachingContext(context)
  const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
  assert.equal(decoded.schema, 'docente-os.teaching-context/v0.1')
  assert.equal(decoded.udaId, '2-01')
})

test('teaching context encoding works in a browser-like runtime without Node Buffer', { concurrency: false }, () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Buffer')
  try {
    Object.defineProperty(globalThis, 'Buffer', { value: undefined, configurable: true })
    const encoded = encodeTeachingContext(context)
    assert.match(encoded, /^[A-Za-z0-9_-]+$/)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'Buffer', descriptor)
  }
})

test('Atlas bundle decoding works in a browser-like runtime without Node Buffer', { concurrency: false }, () => {
  const encoded = Buffer.from(JSON.stringify(validBundle), 'utf8').toString('base64url')
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Buffer')
  try {
    Object.defineProperty(globalThis, 'Buffer', { value: undefined, configurable: true })
    assert.deepEqual(decodeAtlasMaterialBundle(encoded), validBundle)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'Buffer', descriptor)
  }
})

test('Atlas bundle parser fails closed outside the v0.1 material taxonomy', () => {
  assert.deepEqual(parseAtlasMaterialBundle(validBundle), validBundle)
  const encoded = Buffer.from(JSON.stringify(validBundle), 'utf8').toString('base64url')
  assert.deepEqual(decodeAtlasMaterialBundle(encoded), validBundle)
  assert.throws(() => parseAtlasMaterialBundle({ ...validBundle, items: [{ ...validBundle.items[0], type: 'video' }] }))
})
