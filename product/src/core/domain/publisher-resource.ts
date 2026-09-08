import type { TextbookAdoptionWithBook } from './textbook-adoption'

export type PublisherProviderCode = 'ZANICHELLI'

export type PublisherResourceAccessLevel =
  | 'PUBLIC'
  | 'STUDENT'
  | 'TEACHER_RESERVED'

export type PublisherResourceKind =
  | 'EBOOK'
  | 'EXERCISES'
  | 'VIRTUAL_CLASS'
  | 'TEACHER_RESOURCES'

export type PublisherResourcePointer = {
  provider: PublisherProviderCode
  kind: PublisherResourceKind
  title: string
  description: string
  url: string
  accessLevel: PublisherResourceAccessLevel
  requiresExternalLogin: boolean
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
    kind: 'EBOOK',
    title: 'Apri ebook e risorse del libro',
    description: 'Entra nella tua libreria myZanichelli e apri laZ Ebook per il testo che hai attivato.',
    url: 'https://my.zanichelli.it/',
    accessLevel: 'TEACHER_RESERVED',
    requiresExternalLogin: true,
  },
  {
    kind: 'EXERCISES',
    title: 'Cerca esercizi e prove',
    description: 'Apri laZ Esercizi per cercare attività e prove collegate ai libri e alla materia.',
    url: 'https://esercizi.zanichelli.it/',
    accessLevel: 'TEACHER_RESERVED',
    requiresExternalLogin: true,
  },
  {
    kind: 'VIRTUAL_CLASS',
    title: 'Apri Classi Virtuali',
    description: 'Gestisci attività, assegnazioni e risultati nell’ambiente Zanichelli.',
    url: 'https://classivirtuali.zanichelli.it/',
    accessLevel: 'TEACHER_RESERVED',
    requiresExternalLogin: true,
  },
  {
    kind: 'TEACHER_RESOURCES',
    title: 'Risorse riservate all’insegnante',
    description: 'Accedi da myZanichelli ai contenuti disponibili in base alla tua abilitazione docente.',
    url: 'https://my.zanichelli.it/',
    accessLevel: 'TEACHER_RESERVED',
    requiresExternalLogin: true,
  },
]

const ZANICHELLI_PROVIDER: PublisherResourceProvider = {
  code: 'ZANICHELLI',
  matchesPublisher(publisher) {
    return normalizePublisherName(publisher).includes('ZANICHELLI')
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
