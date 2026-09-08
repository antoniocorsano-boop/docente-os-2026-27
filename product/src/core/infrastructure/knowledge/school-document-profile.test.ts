import assert from 'node:assert/strict'
import test from 'node:test'
import { SchoolCommunicationEnrichment } from './school-communication-enrichment'
import { profileSchoolDocument } from './school-document-profile'

const instituteLine = 'ISTITUTO COMPRENSIVO STATALE “LORENZO MILANI” — CALVARIO–COVOTTA'

const corpus = [
  {
    filename: 'A_Curricolo_verticale_Tecnologia.docx',
    text: `${instituteLine}\nAllegato A — Curricolo verticale di Tecnologia. Profilo, competenze, traguardi, obiettivi, conoscenze, abilità, evidenze e valutazione. Proposta curricolare d’Istituto per l’anno scolastico 2026/2027. Acquista efficacia istituzionale dopo l’approvazione dell’organo collegiale competente. Scuola dell’infanzia, primaria e secondaria di primo grado.`,
    category: 'CURRICULUM',
    institutionalStatus: 'PROPOSAL',
  },
  {
    filename: 'B_Modello_Unita_di_Apprendimento_Tecnologia.docx',
    text: `${instituteLine}\nAllegato B — Modello comune di Unità di Apprendimento. Tecnologia, scuola secondaria di primo grado, anno scolastico 2026/2027. Il modello collega curricolo, progettazione, attività, evidenze e valutazione.`,
    category: 'MODEL',
    institutionalStatus: 'UNKNOWN',
  },
  {
    filename: 'C_Prove_iniziali_Tecnologia_e_griglia.docx',
    text: `${instituteLine}\nAllegato C — Prove iniziali e criteri comuni. Tecnologia, classi prima, seconda e terza. Prova iniziale — classe prima. Prova iniziale — classe seconda. Prova iniziale — classe terza. Griglia analitica comune.`,
    category: 'ASSESSMENT',
    institutionalStatus: 'UNKNOWN',
  },
  {
    filename: 'D_Piano_accoglienza_Tecnologia.docx',
    text: `${instituteLine}\nAllegato D — Piano di accoglienza alla Tecnologia. Scuola secondaria di primo grado, anno scolastico 2026/2027. Percorso per la classe prima. Adattamento per le classi seconda e terza. Piano operativo adattabile alle classi.`,
    category: 'PROGRAMMING',
    institutionalStatus: 'OPERATIONAL',
  },
  {
    filename: '00_Relazione_gruppo_Tecnologia.docx',
    text: `${instituteLine}\nRelazione conclusiva del gruppo disciplinare di Tecnologia. Relazione istruttoria destinata al Collegio dei Docenti. Le proposte acquistano efficacia istituzionale esclusivamente dopo i passaggi di competenza. Oggetto dei lavori: revisione del Curricolo verticale di Tecnologia; definizione di una struttura comune per le Unità di Apprendimento; prove iniziali differenziate per le tre classi. Classe prima: Indicazioni nazionali 2025. Seconda e terza: continuità delle coorti nel regime transitorio. Formula proposta.`,
    category: 'REPORT',
    institutionalStatus: 'PROPOSAL',
  },
] as const

for (const fixture of corpus) {
  test(`corpus reale KB: ${fixture.filename}`, () => {
    const profile = profileSchoolDocument({ filename: fixture.filename, text: fixture.text })
    assert.equal(profile.suggestedCategory, fixture.category)
    assert.equal(profile.institutionalStatus, fixture.institutionalStatus)
    assert.deepEqual(profile.disciplines, ['Tecnologia'])
    assert.ok(profile.qualityFlags.includes('INSTITUTION_NAME_CANONICALIZATION_REQUIRED'))
  })
}

test('il curricolo riconosce i tre segmenti scolastici', () => {
  const profile = profileSchoolDocument({ text: corpus[0].text })
  assert.ok(profile.classLabels.includes('Infanzia'))
  assert.ok(profile.classLabels.includes('Primaria'))
  assert.ok(profile.classLabels.includes('Secondaria di I grado'))
})

test('prove iniziali e accoglienza riconoscono le tre classi della secondaria', () => {
  for (const fixture of [corpus[2], corpus[3]]) {
    const profile = profileSchoolDocument({ text: fixture.text })
    assert.ok(profile.classLabels.includes('Classe prima'))
    assert.ok(profile.classLabels.includes('Classe seconda'))
    assert.ok(profile.classLabels.includes('Classe terza'))
  }
})

test('la relazione mantiene la propria identità anche quando cita il curricolo e la coppia seconda-terza', () => {
  const profile = profileSchoolDocument({ filename: corpus[4].filename, text: corpus[4].text })
  assert.equal(profile.suggestedCategory, 'REPORT')
  assert.ok(profile.classLabels.includes('Classe prima'))
  assert.ok(profile.classLabels.includes('Classe seconda'))
  assert.ok(profile.classLabels.includes('Classe terza'))
})

test('la denominazione canonica con don non genera il flag di qualità', () => {
  const profile = profileSchoolDocument({
    text: 'Istituto Comprensivo Statale “don Lorenzo Milani” — Calvario–Covotta. Curricolo verticale di Tecnologia.',
  })
  assert.equal(profile.qualityFlags.includes('INSTITUTION_NAME_CANONICALIZATION_REQUIRED'), false)
})

test('la KB trasforma l’anomalia della denominazione in una osservazione tracciabile da verificare', async () => {
  const enrichment = new SchoolCommunicationEnrichment()
  const result = await enrichment.enrich({
    title: 'Allegato A — Curricolo verticale di Tecnologia',
    documentType: 'GENERAL',
    language: 'it',
    text: corpus[0].text,
    units: [],
    processor: 'fixture',
    processorVersion: '1',
  })

  const qualityUnit = result.units.find((unit) => unit.type === 'RULE' && unit.structuredData?.qualityFlag === 'INSTITUTION_NAME_CANONICALIZATION_REQUIRED')
  assert.ok(qualityUnit)
  assert.equal(qualityUnit?.structuredData?.requiresHumanReview, true)
  assert.equal(qualityUnit?.structuredData?.expectedForm, 'Istituto Comprensivo Statale “don Lorenzo Milani” — Calvario–Covotta')
})
