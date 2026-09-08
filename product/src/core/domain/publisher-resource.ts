import type { TextbookAdoptionWithBook } from './textbook-adoption'

export type PublisherProviderCode = 'ZANICHELLI'
export type PublisherResourceAccessModel = 'EXTERNAL_ACCOUNT' | 'PUBLIC_WEB'
export type PublisherResourceAudience = 'ACCOUNT_HOLDER' | 'TEACHER' | 'PUBLIC'
export type PublisherResourceKind = 'BOOK_SITE' | 'CURRICULUM_ALIGNMENT' | 'LIBRARY' | 'EXERCISES'

export type PublisherResourcePointer = {
  provider: PublisherProviderCode
  kind: PublisherResourceKind
  title: string
  description: string
  url: string
  audience: PublisherResourceAudience
  accessModel: PublisherResourceAccessModel
}

type PublisherTextbookContext = Pick<TextbookAdoptionWithBook, 'status'> & {
  textbook: Pick<TextbookAdoptionWithBook['textbook'], 'isbn13' | 'title' | 'publisher'>
}

type PublisherResourceProvider = {
  code: PublisherProviderCode
  matchesPublisher(publisher: string): boolean
  resourcesFor(textbook: PublisherTextbookContext['textbook']): PublisherResourcePointer[]
}

const ZANICHELLI_GENERIC_RESOURCES: ReadonlyArray<Omit<PublisherResourcePointer, 'provider'>> = [
  {
    kind: 'LIBRARY',
    title: 'Apri libreria e risorse del libro',
    description: 'Accedi a myZanichelli per consultare la tua libreria e le risorse disponibili per i libri attivati sul tuo account.',
    url: 'https://my.zanichelli.it/home',
    audience: 'ACCOUNT_HOLDER',
    accessModel: 'EXTERNAL_ACCOUNT',
  },
  {
    kind: 'EXERCISES',
    title: 'Cerca esercizi e prove',
    description: 'Apri laZ Esercizi in modalità insegnante per cercare attività e prove per libro, capitolo e materia.',
    url: 'https://esercizi.zanichelli.it/insegnante',
    audience: 'TEACHER',
    accessModel: 'EXTERNAL_ACCOUNT',
  },
]

const TECNOLOGIA_VERDE_2ED_ISBNS = new Set([
  '9788808950758',
  '9788808899798',
  '9788808804013',
  '9788808861689',
  '9788808264572',
])

const TECNOLOGIA_VERDE_2ED_RESOURCES: ReadonlyArray<Omit<PublisherResourcePointer, 'provider'>> = [
  {
    kind: 'BOOK_SITE',
    title: 'Sito del libro e materiali docente',
    description: 'Programmazione per competenze, prove modificabili, prove BES, PowerPoint e materiali per la didattica orientativa sono indicati dall’editore per questa opera. La disponibilità effettiva dipende dal tuo account.',
    url: 'https://online.scuola.zanichelli.it/tecnologiaverde2ed/',
    audience: 'TEACHER',
    accessModel: 'EXTERNAL_ACCOUNT',
  },
  {
    kind: 'CURRICULUM_ALIGNMENT',
    title: 'Raccordo con le Indicazioni Nazionali 2025',
    description: 'Documento editoriale pubblico che descrive come Tecnologia.verde 2ed dichiara di raccordarsi alle Indicazioni Nazionali 2025. È una risorsa editoriale di supporto, non una fonte normativa.',
    url: 'https://staticmy.zanichelli.it/catalogo/assets/aC7.9788808264572.pdf',
    audience: 'PUBLIC',
    accessModel: 'PUBLIC_WEB',
  },
]

const ZANICHELLI_PROVIDER: PublisherResourceProvider = {
  code: 'ZANICHELLI',
  matchesPublisher(publisher) {
    return normalizePublisherName(publisher).split(' ').includes('ZANICHELLI')
  },
  resourcesFor(textbook) {
    const courseResources = TECNOLOGIA_VERDE_2ED_ISBNS.has(textbook.isbn13)
      ? TECNOLOGIA_VERDE_2ED_RESOURCES
      : []

    return [...courseResources, ...ZANICHELLI_GENERIC_RESOURCES].map((resource) => ({
      ...resource,
      provider: 'ZANICHELLI',
    }))
  },
}

const PROVIDERS: PublisherResourceProvider[] = [ZANICHELLI_PROVIDER]

export function publisherResourcesForAdoption(
  adoption: PublisherTextbookContext,
): PublisherResourcePointer[] {
  if (adoption.status !== 'CONFIRMED') return []
  const provider = PROVIDERS.find((candidate) => candidate.matchesPublisher(adoption.textbook.publisher))
  return provider?.resourcesFor(adoption.textbook) ?? []
}

function normalizePublisherName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}
