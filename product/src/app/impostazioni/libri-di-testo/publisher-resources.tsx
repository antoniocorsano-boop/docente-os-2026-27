import type { TextbookAdoptionWithBook } from '@/core/domain/textbook-adoption'
import { publisherResourcesForAdoption } from '@/core/domain/publisher-resource'

export function PublisherResources({ adoption }: { adoption: TextbookAdoptionWithBook }) {
  const resources = publisherResourcesForAdoption(adoption)
  if (!resources.length) return null

  return (
    <section className="textbookPublisherResources" aria-label={`Risorse digitali per ${adoption.textbook.title}`}>
      <div className="textbookPublisherResourcesHeader">
        <div>
          <span>RISORSE DIGITALI · ZANICHELLI</span>
          <strong>Usa i servizi collegati al libro</strong>
        </div>
        <small>ISBN {formatIsbn(adoption.textbook.isbn13)}</small>
      </div>
      <div className="textbookPublisherResourceGrid">
        {resources.map((resource) => (
          <a
            href={resource.url}
            key={resource.kind}
            target="_blank"
            rel="noreferrer"
          >
            <strong>{resource.title}</strong>
            <span>{resource.description}</span>
            <small>Apri su Zanichelli ↗</small>
          </a>
        ))}
      </div>
      <p>
        L’accesso e le autorizzazioni restano gestiti da Zanichelli. DOCENTE OS non acquisisce né conserva password, token o sessioni e non importa automaticamente i contenuti protetti.
      </p>
    </section>
  )
}

function formatIsbn(value: string) {
  return `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 7)}-${value.slice(7, 12)}-${value.slice(12)}`
}
