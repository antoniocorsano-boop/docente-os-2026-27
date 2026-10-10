import assert from 'node:assert/strict'
import test from 'node:test'
import type { RegisteredActionDescriptor } from './intelligent-ui-registry'
import {
  INTELLIGENT_UI_ACTION_IDS,
  INTELLIGENT_UI_BLOCK_CATALOG,
  isResolvedRegisteredAction,
  registeredActionSurface,
  resolveRegisteredAction,
} from './intelligent-ui-registry'

test('catalogo iniziale contiene solo i blocchi HOME e CLASS approvati', () => {
  assert.deepEqual(Object.keys(INTELLIGENT_UI_BLOCK_CATALOG).sort(), ['LESSON_FOCUS', 'TASK_FOCUS'])
  assert.equal(INTELLIGENT_UI_BLOCK_CATALOG.TASK_FOCUS.surface, 'HOME')
  assert.equal(INTELLIGENT_UI_BLOCK_CATALOG.LESSON_FOCUS.surface, 'CLASS')
})

test('registro azioni contiene esattamente gli ID della prima tranche', () => {
  assert.deepEqual([...INTELLIGENT_UI_ACTION_IDS].sort(), [
    'CLASS_OPEN_COMPLETION',
    'CLASS_OPEN_INLINE_RECORDER',
    'CLASS_OPEN_MODELED_LESSON',
    'CLASS_OPEN_PLANNING',
    'CLASS_SHOW_ALL',
    'HOME_OPEN_CLASS',
    'HOME_OPEN_LESSON',
    'HOME_OPEN_PLANNER',
    'HOME_OPEN_TIMETABLE',
    'HOME_SHOW_ALL',
  ])
})

test('azioni statiche risolvono solo percorsi interni canonici', () => {
  assert.deepEqual(resolveRegisteredAction({ id: 'HOME_OPEN_PLANNER', label: 'Apri Oggi' }), {
    id: 'HOME_OPEN_PLANNER',
    label: 'Apri Oggi',
    href: '/planner',
  })
  assert.equal(resolveRegisteredAction({ id: 'HOME_OPEN_TIMETABLE', label: 'Vedi orario' }).href, '/orario')
  assert.equal(resolveRegisteredAction({ id: 'HOME_SHOW_ALL', label: 'Esplora tutto' }).href, '#home-full-view')
  assert.equal(resolveRegisteredAction({ id: 'CLASS_OPEN_INLINE_RECORDER', label: 'Registra' }).href, '#registrazione-avanzata')
  assert.equal(resolveRegisteredAction({ id: 'CLASS_OPEN_COMPLETION', label: 'Valuta' }).href, '#decisione-completamento')
})

test('HOME_OPEN_CLASS riusa la continuita task-aware e codifica il contesto', () => {
  const action = resolveRegisteredAction({
    id: 'HOME_OPEN_CLASS',
    label: 'Apri la classe',
    sectionId: 'section 2/c',
    mode: 'prepare',
    blockId: 'B07',
    returnTo: '/?from=home',
  })
  assert.match(action.href, /^\/classi\/section%202%2Fc\?/)
  const query = new URLSearchParams(action.href.split('?')[1])
  assert.equal(query.get('mode'), 'prepare')
  assert.equal(query.get('block'), 'B07')
  assert.equal(query.get('returnTo'), '/?from=home')
})

test('lesson actions usano il builder canonico e non percorsi arbitrari', () => {
  assert.equal(resolveRegisteredAction({
    id: 'HOME_OPEN_LESSON',
    label: 'Continua',
    sectionId: 'section id',
    blockId: 'B03',
    mode: 'teach',
  }).href, '/classi/section%20id/lezioni/B03?mode=teach')

  assert.equal(resolveRegisteredAction({
    id: 'CLASS_OPEN_MODELED_LESSON',
    label: 'Prepara',
    sectionId: 'section id',
    blockId: 'B03',
    mode: 'prepare',
  }).href, '/classi/section%20id/lezioni/B03?mode=prepare')
})

test('CLASS_OPEN_PLANNING costruisce solo la query canonica Progetta', () => {
  const action = resolveRegisteredAction({
    id: 'CLASS_OPEN_PLANNING',
    label: 'Prepara questa fase',
    gradeQuery: 'seconda',
    sectionId: 'section 2/c',
    blockId: 'B07',
    uda: 'UDA 2',
    pack: 'PACK 2',
  })
  const [pathAndQuery, hash] = action.href.split('#')
  const [path, rawQuery] = pathAndQuery.split('?')
  const query = new URLSearchParams(rawQuery)
  assert.equal(path, '/progetta')
  assert.equal(hash, 'focus-operativo')
  assert.equal(query.get('grade'), 'seconda')
  assert.equal(query.get('section'), 'section 2/c')
  assert.equal(query.get('block'), 'B07')
  assert.equal(query.get('uda'), 'UDA 2')
  assert.equal(query.get('pack'), 'PACK 2')
})

test('un descriptor sconosciuto fallisce chiuso', () => {
  assert.throws(
    () => resolveRegisteredAction({ id: 'OPEN_EXTERNAL', label: 'Apri', href: 'https://evil.example' } as unknown as RegisteredActionDescriptor),
    /Unknown registered action descriptor/,
  )
})

test('la validazione delle azioni risolte rifiuta target esterni o mutanti inventati', () => {
  assert.equal(isResolvedRegisteredAction({ id: 'HOME_OPEN_PLANNER', label: 'Apri', href: '/planner' }), true)
  assert.equal(isResolvedRegisteredAction({ id: 'HOME_OPEN_PLANNER', label: 'Apri', href: 'https://evil.example' }), false)
  assert.equal(isResolvedRegisteredAction({ id: 'CLASS_OPEN_COMPLETION', label: 'Valuta', href: '/api/complete' }), false)
  assert.equal(isResolvedRegisteredAction({ id: 'HOME_OPEN_CLASS', label: 'Classe', href: 'javascript:alert(1)' }), false)
})

test('ogni azione registrata appartiene a una sola superficie e nessuna e mutante', () => {
  for (const id of INTELLIGENT_UI_ACTION_IDS) {
    assert.ok(registeredActionSurface(id) === 'HOME' || registeredActionSurface(id) === 'CLASS')
  }
})
