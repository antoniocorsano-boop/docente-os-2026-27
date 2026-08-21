import assert from 'node:assert/strict'
import test from 'node:test'
import type { PdfNativeTextExtractionPort, VisualExtractionPage, VisualExtractionPort } from '@/core/application/ports/knowledge-base'
import type { KnowledgeAsset } from '@/core/domain/knowledge'
import { ImageKnowledgeTransformer, PdfKnowledgeTransformer } from './file-transformers'

const PDF_BYTES = new Uint8Array([1, 2, 3])
const IMAGE_BYTES = new Uint8Array([4, 5, 6])

test('PDF testuale: conserva il testo nativo e non chiama OCR', async () => {
  const visual = new FakeVisualExtraction()
  const transformer = new PdfKnowledgeTransformer(visual, nativePdf([
    'Questa pagina contiene testo nativo sufficiente per essere indicizzato.',
  ]))

  const result = await transformer.transform({ asset: asset('application/pdf', 'testuale.pdf'), bytes: PDF_BYTES })

  assert.equal(visual.calls.length, 0)
  assert.equal(result.processor, 'fake-native-pdf')
  assert.equal(extraction(result).nativePageCount, 1)
  assert.equal(extraction(result).visualPageCount, 0)
  assert.equal(result.units[0]?.structuredData?.extractionMethod, 'NATIVE_TEXT')
})

test('PDF scansionato: chiama OCR per la pagina senza testo', async () => {
  const visual = new FakeVisualExtraction([{ page: 1, text: 'Testo riconosciuto dalla scansione.', description: 'Timbro in alto.', confidence: 0.88 }])
  const transformer = new PdfKnowledgeTransformer(visual, nativePdf(['']))

  const result = await transformer.transform({ asset: asset('application/pdf', 'scansione.pdf'), bytes: PDF_BYTES })

  assert.deepEqual(visual.calls[0]?.pageNumbers, [1])
  assert.equal(extraction(result).nativePageCount, 0)
  assert.equal(extraction(result).visualPageCount, 1)
  assert.ok(result.units.some((unit) => unit.structuredData?.extractionContentType === 'OCR_TEXT'))
  assert.ok(result.units.some((unit) => unit.structuredData?.extractionContentType === 'VISUAL_DESCRIPTION'))
})

test('PDF misto: chiama OCR soltanto per le pagine prive di testo utile', async () => {
  const visual = new FakeVisualExtraction([{ page: 2, text: 'Testo OCR della seconda pagina.', description: null, confidence: 0.81 }])
  const transformer = new PdfKnowledgeTransformer(visual, nativePdf([
    'Testo nativo completo della prima pagina del documento misto.',
    '',
    'Testo nativo completo della terza pagina del documento misto.',
  ]))

  const result = await transformer.transform({ asset: asset('application/pdf', 'misto.pdf'), bytes: PDF_BYTES })

  assert.deepEqual(visual.calls[0]?.pageNumbers, [2])
  assert.equal(extraction(result).nativePageCount, 2)
  assert.equal(extraction(result).visualPageCount, 1)
  assert.equal(result.units.find((unit) => unit.sourcePage === 1)?.structuredData?.extractionMethod, 'NATIVE_TEXT')
  assert.equal(result.units.find((unit) => unit.sourcePage === 2)?.structuredData?.extractionMethod, 'VISUAL_OCR')
  assert.equal(result.units.find((unit) => unit.sourcePage === 3)?.structuredData?.extractionMethod, 'NATIVE_TEXT')
})

test('Immagine: separa testo OCR e descrizione visiva', async () => {
  const visual = new FakeVisualExtraction([{ page: 1, text: 'Avviso del collegio docenti.', description: 'Firma e timbro della scuola.', confidence: 0.9 }])
  const transformer = new ImageKnowledgeTransformer(visual)

  const result = await transformer.transform({ asset: asset('image/jpeg', 'avviso.jpg'), bytes: IMAGE_BYTES })

  assert.equal(result.units.length, 2)
  assert.deepEqual(result.units.map((unit) => unit.structuredData?.extractionContentType), ['OCR_TEXT', 'VISUAL_DESCRIPTION'])
  assert.ok(result.units.every((unit) => unit.structuredData?.requiresHumanReview === true))
})

class FakeVisualExtraction implements VisualExtractionPort {
  readonly calls: Array<{ pageNumbers?: number[] }> = []

  constructor(private readonly pages: VisualExtractionPage[] = [{ page: 1, text: 'Testo OCR simulato sufficientemente lungo.', description: null, confidence: 0.8 }]) {}

  async extract(input: { pageNumbers?: number[] }) {
    this.calls.push({ pageNumbers: input.pageNumbers })
    return { pages: this.pages, processor: 'fake-visual', processorVersion: 'test' }
  }
}

function nativePdf(pages: string[]): PdfNativeTextExtractionPort {
  return {
    async extract() {
      return { totalPages: pages.length, pages, processor: 'fake-native-pdf', processorVersion: 'test' }
    },
  }
}

function asset(mimeType: string, originalName: string): KnowledgeAsset {
  return {
    id: 'asset-1', workspaceId: 'workspace-1', academicYearId: null, assetKind: 'FILE', sourceProvider: 'UPLOAD',
    sourceLocator: 'storage:test', originalName, originalText: null, mimeType, byteSize: 3, sha256: null,
    processingStatus: 'CAPTURED', sourceMetadata: {}, currentGenerationId: null,
    contentCategory: 'OTHER', disciplines: [], classLabels: [], contextStatus: 'UNCLASSIFIED', reliability: 'AUTO', capturedAt: '2026-08-21T00:00:00Z',
    createdBy: 'user-1', createdAt: '2026-08-21T00:00:00Z', updatedAt: '2026-08-21T00:00:00Z',
  }
}

function extraction(result: Awaited<ReturnType<PdfKnowledgeTransformer['transform']>>) {
  return result.extractedData?.extraction as { nativePageCount: number; visualPageCount: number }
}
