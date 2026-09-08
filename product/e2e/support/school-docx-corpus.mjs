import JSZip from 'jszip'

const instituteLine = 'ISTITUTO COMPRENSIVO STATALE “LORENZO MILANI” — CALVARIO–COVOTTA'

export const schoolDocxCorpus = [
  {
    filename: 'A_Curricolo_verticale_Tecnologia.docx',
    category: 'CURRICULUM',
    categoryLabel: 'Curricolo',
    institutionalStatus: 'PROPOSAL',
    expectedClasses: ['Infanzia', 'Primaria', 'Secondaria di I grado'],
    text: `${instituteLine}\nAllegato A — Curricolo verticale di Tecnologia\nProfilo, competenze, traguardi, obiettivi, conoscenze, abilità, evidenze e valutazione — percorso 3–14.\nNatura del documento: proposta curricolare d’Istituto per l’anno scolastico 2026/2027. Acquista efficacia istituzionale dopo l’approvazione dell’organo collegiale competente e resta soggetta a monitoraggio e revisione.\nScuola dell’infanzia — Indicazioni nazionali 2025. Primaria — classe prima. Secondaria di primo grado — classe prima e classi II–III.\nIl curricolo di Tecnologia accompagna l’alunno dalla curiosità verso oggetti, materiali e procedure alla capacità di leggere sistemi tecnici, progettare soluzioni, rappresentarle, realizzarle e valutarne conseguenze, sicurezza e sostenibilità.`,
  },
  {
    filename: 'B_Modello_Unita_di_Apprendimento_Tecnologia.docx',
    category: 'MODEL',
    categoryLabel: 'Modello',
    institutionalStatus: 'UNKNOWN',
    expectedClasses: ['Secondaria di I grado'],
    text: `${instituteLine}\nAllegato B — Modello comune di Unità di Apprendimento\nTecnologia — scuola secondaria di primo grado — anno scolastico 2026/2027.\nFunzione: il modello collega in modo verificabile curricolo, progettazione, attività, evidenze e valutazione. I campi vanno compilati in forma essenziale e adattati alla classe reale.\nDati identificativi: Titolo; Classe e sezione; Periodo; Durata prevista; Docente/i; Nucleo/i del curricolo.\nArticolazione operativa: attivazione; osservazione e ricerca; ideazione e progetto; realizzazione o simulazione; verifica e miglioramento; restituzione e autovalutazione.`,
  },
  {
    filename: 'C_Prove_iniziali_Tecnologia_e_griglia.docx',
    category: 'ASSESSMENT',
    categoryLabel: 'Verifica o valutazione',
    institutionalStatus: 'UNKNOWN',
    expectedClasses: ['Classe prima', 'Classe seconda', 'Classe terza'],
    text: `${instituteLine}\nAllegato C — Prove iniziali e criteri comuni\nTecnologia — classi prima, seconda e terza — anno scolastico 2026/2027.\nFinalità: rilevare prerequisiti, strategie e bisogni per orientare la progettazione. Gli esiti hanno funzione diagnostica e formativa e non determinano automaticamente un voto.\nProva iniziale — classe prima. Prova iniziale — classe seconda. Prova iniziale — classe terza. Griglia analitica comune.\nAnalizzare i risultati per indicatore e non soltanto per punteggio totale; registrare nel piano annuale le eventuali rimodulazioni motivate.`,
  },
  {
    filename: 'D_Piano_accoglienza_Tecnologia.docx',
    category: 'PROGRAMMING',
    categoryLabel: 'Programmazione',
    institutionalStatus: 'OPERATIONAL',
    expectedClasses: ['Classe prima', 'Classe seconda', 'Classe terza'],
    text: `${instituteLine}\nAllegato D — Piano di accoglienza alla Tecnologia\nScuola secondaria di primo grado — anno scolastico 2026/2027.\nFinalità: far conoscere identità, linguaggi, metodo e regole della disciplina; costruire un clima di lavoro sicuro e inclusivo; raccogliere prime evidenze senza funzione selettiva.\nPercorso per la classe prima — quattro ore. Adattamento per le classi seconda e terza. Piano operativo adattabile alle classi.\nCondizioni di attuazione: verifica preventiva di spazi, strumenti, materiali e procedure di emergenza; tutela dei dati personali.`,
  },
  {
    filename: '00_Relazione_gruppo_Tecnologia.docx',
    category: 'REPORT',
    categoryLabel: 'Relazione',
    institutionalStatus: 'PROPOSAL',
    expectedClasses: ['Classe prima', 'Classe seconda', 'Classe terza'],
    text: `${instituteLine}\nRelazione conclusiva del gruppo disciplinare di Tecnologia\nLavori dipartimentali per l’avvio dell’anno scolastico 2026/2027.\nNatura del documento: relazione istruttoria destinata al Collegio dei Docenti. Le proposte acquistano efficacia istituzionale esclusivamente dopo i passaggi di competenza.\nOggetto dei lavori: revisione del Curricolo verticale di Tecnologia; struttura comune per le Unità di Apprendimento; prove iniziali differenziate per le tre classi; organizzazione dell’accoglienza.\nClasse prima: Indicazioni nazionali 2025. Seconda e terza: continuità delle coorti nel regime transitorio. Formula proposta per approvazione collegiale.`,
  },
]

export async function buildSchoolDocxFixture(fixture) {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', contentTypesXml())
  zip.folder('_rels').file('.rels', packageRelationshipsXml())
  zip.folder('word').file('document.xml', documentXml(fixture.text))
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
}

function packageRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
}

function documentXml(text) {
  const paragraphs = text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(paragraph)}</w:t></w:r></w:p>`)
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraphs}<w:sectPr/></w:body>
</w:document>`
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
