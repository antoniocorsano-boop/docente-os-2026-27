import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canonicalizeMaterialContentV1,
  digestMaterialContentV1,
  type MaterialContentSnapshotV1,
} from './material-content-digest'

function snapshot(): MaterialContentSnapshotV1 {
  return {
    assetContent: {
      originalText: null,
      mimeType: 'application/pdf',
      sourceSha256: '1'.repeat(64),
    },
    document: {
      title: 'Energia e trasformazioni',
      documentType: 'TEACHING',
      language: 'it',
      normalizedText: 'L’energia si trasforma.',
      normalizedMarkdown: '# Energia\nL’energia si trasforma.',
      summary: 'Sintesi per la lezione.',
      extractedData: { level: 3, tags: ['energia', 'trasformazioni'] },
    },
    units: [
      {
        ordinal: 1,
        unitType: 'TOPIC',
        title: 'Trasformazioni',
        content: 'Esempi di trasformazione energetica.',
        structuredData: { examples: ['lampadina', 'motore'] },
        sourcePage: 2,
        startOffset: 20,
        endOffset: 55,
      },
      {
        ordinal: 0,
        unitType: 'CHUNK',
        title: 'Definizione',
        content: 'L’energia è la capacità di compiere lavoro.',
        structuredData: { key: true },
        sourcePage: 1,
        startOffset: 0,
        endOffset: 19,
      },
    ],
    referencedBinaryContent: [
      { ref: 'diagram-1', mimeType: 'image/png', bytes: new Uint8Array([1, 2, 3, 4]) },
    ],
  }
}

test('deterministic ordering yields the same canonical content and SHA-256 digest', () => {
  const left = snapshot()
  const right = snapshot()
  right.units = [...right.units].reverse()
  right.document.extractedData = { tags: ['energia', 'trasformazioni'], level: 3 }
  right.units[0].structuredData = { examples: ['lampadina', 'motore'] }

  assert.equal(canonicalizeMaterialContentV1(left), canonicalizeMaterialContentV1(right))
  assert.deepEqual(digestMaterialContentV1(left), digestMaterialContentV1(right))
})

test('document content mutation changes digest while generation identity can remain unchanged externally', () => {
  const before = snapshot()
  const after = snapshot()
  after.document.normalizedText = 'L’energia si trasforma e si conserva.'

  assert.notEqual(digestMaterialContentV1(before).value, digestMaterialContentV1(after).value)
})

test('unit content mutation changes digest independently of document or generation identifiers', () => {
  const before = snapshot()
  const after = snapshot()
  after.units[0].content = 'Contenuto della stessa unità modificato in-place.'

  assert.notEqual(digestMaterialContentV1(before).value, digestMaterialContentV1(after).value)
})

test('referenced binary content mutation changes digest', () => {
  const before = snapshot()
  const after = snapshot()
  after.referencedBinaryContent[0] = {
    ...after.referencedBinaryContent[0],
    bytes: new Uint8Array([1, 2, 3, 5]),
  }

  assert.notEqual(digestMaterialContentV1(before).value, digestMaterialContentV1(after).value)
})

test('metadata identifiers and timestamps do not establish accepted content identity', () => {
  const canonical = canonicalizeMaterialContentV1(snapshot())

  assert.doesNotMatch(canonical, /assetId|generationId|workspaceId|createdAt|updatedAt/)
  assert.match(canonical, /normalizedText/)
  assert.match(canonical, /referencedBinaryContent/)
})

test('digest contract is fixed to SHA-256 and docente-os.material-content.v1', () => {
  const digest = digestMaterialContentV1(snapshot())
  assert.equal(digest.algorithm, 'SHA-256')
  assert.equal(digest.canonicalization, 'docente-os.material-content.v1')
  assert.match(digest.value, /^[a-f0-9]{64}$/)
})
