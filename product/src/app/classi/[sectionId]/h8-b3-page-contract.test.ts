import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

describe('H8-B3 class receipt wiring', () => {
  it('mounts the governed replanning receipt without replacing the class workspace', () => {
    assert.ok(pageSource.includes("import { SessionReplanningReceipt } from './session-replanning-receipt'"))
    assert.ok(pageSource.includes('replanning?: string'))
    assert.ok(pageSource.includes('<SessionReplanningReceipt'))
    assert.ok(pageSource.includes('allocations={teachingSnapshot.allocations}'))
    assert.ok(pageSource.includes('promoted={Boolean(query.replanning)}'))
    assert.ok(pageSource.includes('Supporti per questa lezione'))
    assert.ok(pageSource.includes('Contesto della classe e altri percorsi'))
  })
})
