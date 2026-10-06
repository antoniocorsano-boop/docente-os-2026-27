import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  assetKindLabel,
  humanizeKnowledgeTitle,
  knowledgeProcessingStatus,
  sourceProviderLabel,
  unitTypeLabel,
} from './product-language'

test('technical knowledge statuses become teacher-facing statuses', () => {
  assert.equal(knowledgeProcessingStatus('INDEXED').label, 'Pronto')
  assert.equal(knowledgeProcessingStatus('FAILED').label, 'Da riprovare')
  assert.match(knowledgeProcessingStatus('FAILED').description, /originale resta conservato/i)
})

test('providers and asset kinds use professional language', () => {
  assert.equal(sourceProviderLabel('UPLOAD'), 'File acquisito')
  assert.equal(sourceProviderLabel('DRIVE'), 'Google Drive')
  assert.equal(sourceProviderLabel('MANUAL'), 'Inserito da te')
  assert.equal(assetKindLabel('GENERATED'), 'Creato in DOCENTE OS')
  assert.equal(unitTypeLabel('CHUNK'), 'Contenuto')
})

test('canonical and file-system titles are humanized without altering stored data', () => {
  assert.equal(
    humanizeKnowledgeTitle('CAN-PLAN-1_Piano_annuale_operativo_Tecnologia_Classe_1_2026-2027'),
    'Piano annuale operativo Tecnologia Classe 1 2026-2027',
  )
  assert.equal(humanizeKnowledgeTitle('programmazione_annuale.docx'), 'programmazione annuale')
  assert.equal(humanizeKnowledgeTitle('Idee per insegnare-anonimizzato.txt'), 'Idee per insegnare')
  assert.equal(humanizeKnowledgeTitle(null), 'Contenuto senza titolo')
})

test('account and authentication copy hides implementation jargon from ordinary teacher-facing surfaces', () => {
  const login = source('../../app/login/page.tsx')
  const account = source('../../app/account/page.tsx')
  const mfaGate = source('../../app/mfa/page.tsx')
  const mfaManagement = source('../../app/account/mfa/page.tsx')
  const password = source('../../app/imposta-password/page.tsx')

  assert.doesNotMatch(login, /servizio email di Supabase/i)
  assert.doesNotMatch(login, /autorizzazioni applicative restano governate da Supabase e RLS/i)
  assert.doesNotMatch(account, /identità è gestita da Supabase Auth/i)
  assert.doesNotMatch(account, /autenticatore.*TOTP verificato/i)
  assert.doesNotMatch(mfaGate, /passaggio ad AAL2/i)
  assert.doesNotMatch(mfaManagement, /Autenticatori TOTP/i)
  assert.doesNotMatch(mfaManagement, /sessione già verificata ad AAL2/i)
  assert.doesNotMatch(password, /password resta gestita da Supabase Auth/i)
  assert.doesNotMatch(password, /sessione MFA verificata/i)

  assert.match(login, /accesso con password continua a funzionare normalmente/i)
  assert.match(account, /secondo fattore/i)
  assert.match(mfaGate, /codice temporaneo dell’autenticatore/i)
  assert.match(mfaManagement, /autenticatore/i)
  assert.match(password, /secondo fattore verificat/i)
})

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}
