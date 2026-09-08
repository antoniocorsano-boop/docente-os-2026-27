import type { KnowledgeContentCategory } from '@/core/domain/knowledge'

export type SchoolDocumentProfile = {
  suggestedCategory: KnowledgeContentCategory
  disciplines: string[]
  classLabels: string[]
  qualityFlags: string[]
  institutionalStatus: 'PROPOSAL' | 'OPERATIONAL' | 'UNKNOWN'
}

export function profileSchoolDocument(input: { filename?: string | null; title?: string | null; text?: string | null }): SchoolDocumentProfile {
  const haystack = normalize([input.filename, input.title, input.text].filter(Boolean).join('\n'))
  const qualityFlags: string[] = []

  if (/istituto comprensivo statale\s+["“]?lorenzo milani["”]?/.test(haystack) && !/don\s+lorenzo milani/.test(haystack)) {
    qualityFlags.push('INSTITUTION_NAME_CANONICALIZATION_REQUIRED')
  }

  const institutionalStatus = /proposta|da deliberare|soggett[oa] ad approvazione|pronto per esame e approvazione collegiale|formula proposta/.test(haystack)
    ? 'PROPOSAL'
    : /piano operativo|uso diagnostico|attivita effettivamente svolte/.test(haystack)
      ? 'OPERATIONAL'
      : 'UNKNOWN'

  return {
    suggestedCategory: inferCategory(haystack),
    disciplines: /\btecnologia\b/.test(haystack) ? ['Tecnologia'] : [],
    classLabels: inferClasses(haystack),
    qualityFlags,
    institutionalStatus,
  }
}

function inferCategory(text: string): KnowledgeContentCategory {
  // Document identity outranks subjects merely cited inside the document.
  // A departmental report can discuss the vertical curriculum without becoming a curriculum itself.
  if (/relazione conclusiva del gruppo disciplinare|relazione istruttoria/.test(text)) return 'REPORT'
  if (isAssessment(text)) return 'ASSESSMENT'
  if (/modello comune di unita di apprendimento|modello comune di uda/.test(text)) return 'MODEL'
  if (/piano di accoglienza|accoglienza alla tecnologia/.test(text)) return 'PROGRAMMING'
  if (/curricolo verticale/.test(text)) return 'CURRICULUM'
  if (/unita di apprendimento|\buda\b/.test(text)) return 'UDA'
  if (/circolare/.test(text)) return 'CIRCULAR'
  if (/comunicazione|collegio dei docenti/.test(text)) return 'COMMUNICATION'
  return 'OTHER'
}

function isAssessment(text: string) {
  if (/prove iniziali|prova iniziale|griglia analitica comune/.test(text)) return true

  const markers = [
    /\bprova\s+\d+\s*[-–—]?\s*fila\s+[a-z]\b/,
    /\bverificare le conoscenze\b/,
    /\bindica con una x la risposta giusta\b/,
    /\bfai gli abbinamenti giusti\b/,
    /\brispondere alle domande\b/,
  ]
  return markers.filter((pattern) => pattern.test(text)).length >= 2
}

function inferClasses(text: string) {
  const labels = new Set<string>()
  const allThree = /classi?\s+prima\s*[,/]?\s*seconda\s+(?:e|,)\s*terza/.test(text)
  const secondAndThird = /(?:classi?\s+)?seconda\s+(?:e|,)\s*terza\b/.test(text)

  if (allThree || /class(?:e|i)\s+prima|classi?\s+i\b|secondaria\s+[-—]\s+i\b/.test(text)) labels.add('Classe prima')
  if (allThree || secondAndThird || /class(?:e|i)\s+seconda|classi?\s+ii\b|secondaria\s+[-—]\s+ii\b/.test(text)) labels.add('Classe seconda')
  if (allThree || secondAndThird || /class(?:e|i)\s+terza|classi?\s+iii\b|secondaria\s+[-—]\s+iii\b/.test(text)) labels.add('Classe terza')
  if (/infanzia/.test(text)) labels.add('Infanzia')
  if (/primaria/.test(text)) labels.add('Primaria')
  if (/secondaria di primo grado|secondaria\s+di\s+i\s+grado/.test(text)) labels.add('Secondaria di I grado')
  return [...labels]
}

function normalize(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
}
