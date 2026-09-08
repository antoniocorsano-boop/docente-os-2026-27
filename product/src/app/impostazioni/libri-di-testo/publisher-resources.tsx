import Link from 'next/link'
import type { TextbookAdoptionWithBook } from '@/core/domain/textbook-adoption'
import { publisherResourcesForAdoption } from '@/core/domain/publisher-resource'
import './publisher-resources.css'

export function PublisherResources({ adoption }: { adoption: TextbookAdoptionWithBook }) {
  const resources = publisherResourcesForAdoption(adoption)
  if (!resources.length) return null

  return (
    <section className="textbookPublisherResources" aria-label={`Risorse digitali per ${adoption.textbook.title}`}>
      <div className="textbookPublisherResourcesHeader">
        <div>
          <span>RISORSE DELL’EDITORE · ZANICHELLI</span>
          <strong>Usa il libro come punto di accesso ai materiali</strong>
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
            <small>{resource.accessModel === 'PUBLIC_WEB' ? 'Apri risorsa pubblica ↗' : 'Apri su Zanichelli ↗'}</small>
          </a>
        ))}
      </div>

      <div className="textbookKnowledgeImport">
        <div>
          <strong>Hai già una guida, una verifica o un altro file?</strong>
          <span>Se lo hai ottenuto legittimamente, puoi aggiungerlo alla tua Conoscenza privata e conservarne il collegamento a questo libro.</span>
        </div>
        <Link href={`/knowledge/from-textbook/${adoption.textbook.id}`}>Aggiungi alla Conoscenza</Link>
      </div>

      <p>
        L’accesso alle risorse protette e le autorizzazioni restano gestiti dall’editore. DOCENTE OS non acquisisce password, token o sessioni e non scarica automaticamente contenuti protetti. Le risorse editoriali restano materiali di supporto e non sostituiscono le fonti normative o il curricolo confermato.
      </p>
    </section>
  )
}

function formatIsbn(value: string) {
  return `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 7)}-${value.slice(7, 12)}-${value.slice(12)}`
}
