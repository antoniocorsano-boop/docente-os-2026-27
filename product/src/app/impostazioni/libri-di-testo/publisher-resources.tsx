import Link from 'next/link'
import type { TextbookAdoptionWithBook } from '@/core/domain/textbook-adoption'
import { publisherResourcesForAdoption } from '@/core/domain/publisher-resource'
import {
  teachingMaterialRoleLabel,
  textbookTeachingKitForAdoption,
} from '@/core/domain/textbook-teaching-kit'
import './publisher-resources.css'

export function PublisherResources({ adoption }: { adoption: TextbookAdoptionWithBook }) {
  const resources = publisherResourcesForAdoption(adoption)
  const teachingKit = textbookTeachingKitForAdoption(adoption)
  if (!resources.length && !teachingKit) return null

  return (
    <section className="textbookPublisherResources" aria-label={`Risorse digitali per ${adoption.textbook.title}`}>
      <div className="textbookPublisherResourcesHeader">
        <div>
          <span>RISORSE DELL’EDITORE · ZANICHELLI</span>
          <strong>Usa il libro come punto di accesso ai materiali</strong>
        </div>
        <small>ISBN {formatIsbn(adoption.textbook.isbn13)}</small>
      </div>

      {resources.length ? (
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
      ) : null}

      {teachingKit ? (
        <div className="textbookPilotKit" aria-label={`${teachingKit.id} kit pilota materiali docente`}>
          <div className="textbookPilotKitHeading">
            <div>
              <span>KIT PILOTA · {teachingKit.id}</span>
              <strong>{teachingKit.title}</strong>
              <p>Un solo kit è sufficiente per tutte le classi che usano questo stesso corso. DOCENTE OS userà i materiali per imparare a suggerire quando e come impiegarli.</p>
            </div>
            <a href={teachingKit.guide.identityUrl} target="_blank" rel="noreferrer">Controlla la guida ↗</a>
          </div>

          <div className="textbookPilotGuide">
            <div>
              <small>GUIDA PRINCIPALE</small>
              <strong>{teachingKit.guide.title}</strong>
              <span>{teachingKit.guide.pages} pagine · ISBN {formatIsbn(teachingKit.guide.isbn13)}</span>
            </div>
            <p>La guida è registrata come materiale atteso, non come file già disponibile: deve essere acquisita legittimamente dal docente prima che DOCENTE OS possa analizzarne il contenuto.</p>
          </div>

          <div className="textbookPilotSlots">
            {teachingKit.slots.map((slot) => (
              <article key={slot.id}>
                <div>
                  <small>{slot.roles.map(teachingMaterialRoleLabel).join(' · ')}</small>
                  <strong>{slot.label}</strong>
                  <p>{slot.description}</p>
                </div>
                <span>Da acquisire</span>
              </article>
            ))}
          </div>

          <div className="textbookPilotActions">
            <p>Parti da uno dei quattro materiali. Dopo l’upload, la classificazione pedagogica resta una proposta controllabile dal docente.</p>
            <Link href={`/knowledge/from-textbook/${adoption.textbook.id}`}>Aggiungi un materiale del kit</Link>
          </div>
        </div>
      ) : null}

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
