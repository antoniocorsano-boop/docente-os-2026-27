import type { TextbookAdoptionWithBook } from './textbook-adoption'

export type PublisherProviderCode = 'ZANICHELLI'
export type PublisherResourceAccessModel = 'EXTERNAL_ACCOUNT'
export type PublisherResourceAudience = 'ACCOUNT_HOLDER' | 'TEACHER'
export type PublisherResourceKind = 'LIBRARY' | 'EXERCISES'

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

const ZANICHELLI_RESOURCES: ReadonlyArray<Omit<PublisherResourcePointer, 'provider'>> = [
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

const ZANICHELLI_PROVIDER: PublisherResourceProvider = {
  code: 'ZANICHELLI',
  matchesPublisher(publisher) {
    return normalizePublisherName(publisher).split(' ').includes('ZANICHELLI')
  },
  resourcesFor() {
    return ZANICHELLI_RESOURCES.map((resource) => ({
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
