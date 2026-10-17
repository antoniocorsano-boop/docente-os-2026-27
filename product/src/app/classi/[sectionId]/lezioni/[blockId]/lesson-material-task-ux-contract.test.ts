import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createRequire } from 'node:module'
import { Children, isValidElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const source = readFileSync(new URL('./lesson-design-tools.tsx', import.meta.url), 'utf8')

// Exercise the real component with deterministic hooks and no server action access.
// This complements the source contract: text hidden in an inactive branch cannot pass.
const require = createRequire(import.meta.url)
function renderIntent(intent?: string, overrides: Record<string, unknown> = {}) {
  const changes: string[] = []
  const writes: unknown[] = []
  const output = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const exports: { LessonDesignTools?: (props: Record<string, unknown>) => ReactNode } = {}
  const localRequire = (name: string) => {
    if (name === 'react') return {
      useState: (initial: string) => [intent ?? initial, (next: string) => changes.push(next)],
      useActionState: () => [{ notice: null, revision: 0 }, (data: unknown) => writes.push(data)],
    }
    if (name === 'react-dom') return { useFormStatus: () => ({ pending: false }) }
    if (name === 'next/link') return { __esModule: true, default: 'a' }
    if (name === './design-actions') return { runLessonDesignWrite: () => assert.fail('Server writes must not run during rendering') }
    if (name.includes('source-provenance')) return { SourceProvenance: () => null }
    if (name.includes('lesson-design-extension')) return { isTeachingAdjustment: (e: { kind: string }) => e.kind === 'TEACHING_ADJUSTMENT' }
    if (name.includes('textbook-teaching-kit')) return { teachingMaterialRoleLabel: (role: string) => role }
    if (name === 'react/jsx-runtime') return require(name)
    throw new Error(`Unexpected component dependency: ${name}`)
  }
  new Function('require', 'exports', output)(localRequire, exports)
  assert.ok(exports.LessonDesignTools)
  const tree = exports.LessonDesignTools({
    sectionId: 'section/2C', blockId: 'block?1', projectionId: 'projection-1',
    extensions: [], knowledgeSuggestions: [], atlasSuggestions: [], ...overrides,
  })
  return { tree, html: renderToStaticMarkup(tree), changes, writes }
}

function intentButtons(tree: ReactNode): Array<Record<string, unknown>> {
  return Children.toArray(tree).flatMap((node) => {
    if (!isValidElement<Record<string, unknown>>(node)) return []
    if (node.type === 'button' && 'aria-pressed' in node.props) return [node.props]
    return intentButtons(node.props.children as ReactNode)
  })
}

test('intent controls select only local UI state and render mutually exclusive panels', () => {
  const initial = renderIntent()
  const buttons = intentButtons(initial.tree)
  assert.equal(buttons.length, 3)
  assert.deepEqual(buttons.map((button) => button['aria-pressed']), [true, false, false])
  for (const button of buttons) {
    assert.equal(button.type, 'button')
    ;(button.onClick as () => void)()
  }
  assert.deepEqual(initial.changes, ['reuse', 'adapt', 'create'])
  assert.deepEqual(initial.writes, [])
  for (const [intent, label] of [['reuse', 'Materiali disponibili'], ['adapt', 'Materiali da adattare'], ['create', 'Crea un materiale']]) {
    const { html, writes } = renderIntent(intent)
    for (const other of ['Materiali disponibili', 'Materiali da adattare', 'Crea un materiale']) {
      assert.equal(html.includes(`aria-label="${other}"`), other === label)
    }
    assert.deepEqual(writes, [])
  }
})

test('reuse exposes explicit attachment for either source and no false empty state', () => {
  const atlas = { materialId: 'atlas-1', kind: 'handout', state: 'PUBLISHED', title: 'Fonte Atlas', publicUrl: 'https://example.org/material' }
  const knowledge = { assetId: 'knowledge-1', title: 'Fonte docente', pedagogicalRoles: [] }
  for (const [items, intent] of [[{ atlasSuggestions: [atlas] }, 'attach-atlas'], [{ knowledgeSuggestions: [knowledge] }, 'attach-knowledge']] as const) {
    const { html, writes } = renderIntent('reuse', items)
    assert.ok(html.includes(`name="designIntent" value="${intent}"`))
    assert.ok(html.includes('Usa questo materiale'))
    assert.ok(!html.includes('Non ci sono materiali pertinenti'))
    assert.deepEqual(writes, [])
  }
})

test('adapt exposes accepted material revision with context and mandatory review warning', () => {
  const { html, writes } = renderIntent('adapt', { extensions: [{
    id: 'material-1', kind: 'TEACHER_RESOURCE', status: 'ACCEPTED', title: 'Scheda', body: 'Note', payload: {},
  }] })
  assert.ok(html.includes('name="designIntent" value="revise"'))
  assert.ok(html.includes('name="extensionId" value="material-1"'))
  assert.ok(html.includes('name="projectionId" value="projection-1"'))
  assert.ok(html.includes('torna “Da controllare”'))
  assert.ok(html.includes('L’originale resta invariato'))
  assert.deepEqual(writes, [])
})

test('create links to canonical capture with encoded lesson context and no implicit attachment', () => {
  const { html, writes } = renderIntent('create')
  const href = html.match(/href="([^"]+)"[^>]*>Aggiungi un nuovo contenuto/)?.[1]?.replaceAll('&amp;', '&')
  assert.ok(href)
  const url = new URL(href, 'https://docente.example')
  assert.equal(url.pathname, '/knowledge')
  assert.equal(url.searchParams.get('capture'), 'text')
  assert.equal(url.searchParams.get('mode'), 'prepare')
  assert.equal(url.searchParams.get('section'), 'section/2C')
  assert.equal(url.searchParams.get('block'), 'block?1')
  assert.equal(url.searchParams.get('returnTo'), '/classi/section%2F2C/lezioni/block%3F1?mode=prepare')
  assert.ok(!html.includes('value="attach-'))
  assert.deepEqual(writes, [])
})

test('material preparation is organized around the teacher intent', () => {
  assert.ok(source.includes("type MaterialPreparationIntent = 'reuse' | 'adapt' | 'create'"))
  assert.ok(source.includes("useState<MaterialPreparationIntent>('reuse')"))
  assert.ok(source.includes('Prepara materiali'))
  assert.ok(source.includes('Riutilizza'))
  assert.ok(source.includes('Adatta'))
  assert.ok(source.includes('Crea nuovo'))
  assert.ok(source.includes("aria-pressed={materialIntent === 'reuse'}"))
  assert.ok(source.includes("aria-pressed={materialIntent === 'adapt'}"))
  assert.ok(source.includes("aria-pressed={materialIntent === 'create'}"))
})

test('changing material intent is local UI state and canonical acceptance stays explicit', () => {
  assert.ok(source.includes('type="button"'))
  assert.ok(source.includes('setMaterialIntent('))
  assert.ok(source.includes('name="designIntent" value="attach-knowledge"'))
  assert.ok(source.includes('name="designIntent" value="attach-atlas"'))
  assert.ok(source.includes('idle="Usa questo materiale"'))
})

test('providers remain provenance, not the primary material taxonomy', () => {
  assert.ok(!source.includes('<strong>Da Atlas</strong>'))
  assert.ok(source.includes('Materiali disponibili'))
  assert.ok(source.includes('<SourceProvenance kind="ATLAS" />'))
})

test('adapting a lesson material preserves the source and returns through review', () => {
  assert.ok(source.includes('materialProposals'))
  assert.ok(source.includes('acceptedResources'))
  assert.ok(source.includes('L’originale resta invariato'))
  assert.ok(source.includes('torna “Da controllare”'))
  assert.ok(source.includes('<EditExtensionForm'))
})

test('creating a new material reuses Knowledge capture without attaching implicitly', () => {
  assert.ok(source.includes('buildKnowledgeCaptureHref'))
  assert.ok(source.includes('capture=text'))
  assert.ok(source.includes('mode=prepare'))
  assert.ok(source.includes('Aggiungi un nuovo contenuto'))
})

test('creating a new material preserves preparation context after text and file capture', () => {
  const knowledgePage = readFileSync(new URL('../../../../knowledge/page.tsx', import.meta.url), 'utf8')
  const captureModes = readFileSync(new URL('../../../../knowledge/KnowledgeCaptureModes.tsx', import.meta.url), 'utf8')
  const noteForm = readFileSync(new URL('../../../../knowledge/AnonymousKnowledgeNoteForm.tsx', import.meta.url), 'utf8')
  const knowledgeActions = readFileSync(new URL('../../../../knowledge/actions.ts', import.meta.url), 'utf8')

  assert.ok(knowledgePage.includes('taskPostCaptureQuery'))
  assert.ok(knowledgePage.includes('postUploadQuery={calendarIntent && calendarReturnTo'))
  assert.ok(knowledgePage.includes(': taskPostCaptureQuery}'))
  assert.ok(captureModes.includes('<AnonymousKnowledgeNoteForm postCaptureQuery={postUploadQuery} />'))
  assert.ok(noteForm.includes('name="postCaptureQuery"'))
  assert.ok(knowledgeActions.includes("formData.get('postCaptureQuery')"))
  assert.ok(knowledgeActions.includes('postCaptureQuery ? `?${postCaptureQuery}` :'))
})
