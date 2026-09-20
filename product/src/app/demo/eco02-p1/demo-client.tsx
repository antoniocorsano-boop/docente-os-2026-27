"use client"

import { useState } from "react"
import { CheckCircle2, Clock3, Eye, RefreshCw, ShieldCheck } from "lucide-react"
import styles from "./page.module.css"

type VisualDecision = "MANTIENI" | "SOSTITUISCI" | "ESCLUDI"

const sequence = [
  ["Osservazione di un paesaggio agricolo", 10],
  ["Riconoscimento delle componenti del sistema", 15],
  ["Schema input → processo → output sul quaderno", 20],
  ["Confronto tra elaborati", 10],
  ["Verifica finale: “Un sistema agricolo funziona perché…”", 5],
] as const

const sourceClass = {
  Arena: styles.arena,
  Atlas: styles.atlas,
  "Docente OS": styles.dos,
} as const

function Source({ source }: { source: keyof typeof sourceClass }) {
  return <span className={`${styles.source} ${sourceClass[source]}`}>Origine: {source}</span>
}

export default function Eco02P1DemoPage() {
  const [minutes, setMinutes] = useState(60)
  const [visualDecision, setVisualDecision] = useState<VisualDecision>("MANTIENI")
  const [revalidated, setRevalidated] = useState(false)

  function chooseMinutes(value: number) {
    setMinutes(value)
    setRevalidated(false)
  }

  function chooseVisual(value: VisualDecision) {
    setVisualDecision(value)
    setRevalidated(false)
  }

  const visualDecisionLabel =
    visualDecision === "MANTIENI"
      ? "mantieni la proposta Atlas, subordinata alla selezione finale"
      : visualDecision === "SOSTITUISCI"
        ? "sostituisci la proposta Atlas con una risorsa scelta dal docente"
        : "escludi il supporto visuale dalla preparazione"

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <p className={styles.kicker}>ECO-02 / P1 · DIMOSTRAZIONE PUBBLICA</p>
            <h1>Preparare una lezione mantenendo il controllo docente</h1>
            <p className={styles.lead}>
              Tecnologia · classe 2C · “Agricoltura come sistema tecnologico”.
              Simulazione del percorso curricolo → obiettivi → attività → materiali → verifica.
            </p>
          </div>
          <div className={styles.statusGrid}>
            <div><ShieldCheck aria-hidden="true" /><span><strong>DOS-A1</strong><small>RUNTIME_DEFERRED</small></span></div>
            <div><Eye aria-hidden="true" /><span><strong>Provenienza</strong><small>Sempre visibile</small></span></div>
            <div><CheckCircle2 aria-hidden="true" /><span><strong>Decisione finale</strong><small>Sempre del docente</small></span></div>
          </div>
        </header>

        <section className={styles.notice}>
          <strong>Dimostrazione non operativa.</strong>
          <span>Nessuna scrittura, nessun dato personale, nessuna automazione autonoma.</span>
        </section>

        <section className={styles.flow} aria-label="Flusso di preparazione">
          {[
            ["1", "Curricolo", "Arena"],
            ["2", "Obiettivo", "Docente OS"],
            ["3", "Attività", "Docente OS"],
            ["4", "Materiali", "Atlas + Docente OS"],
            ["5", "Verifica", "Docente OS"],
          ].map(([step, title, source]) => (
            <article key={step}>
              <span className={styles.step}>{step}</span>
              <h2>{title}</h2>
              <p>{source}</p>
            </article>
          ))}
        </section>

        <div className={styles.columns}>
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <p className={styles.eyebrow}>Sequenza didattica</p>
                <h2>Lezione da 60 minuti</h2>
              </div>
              <Source source="Arena" />
            </div>

            <div className={styles.curriculumBox}>
              <strong>Riferimento curricolare</strong>
              <p>
                Regime transitorio 2012 · sorgente <code>departmentCurriculumV31.section-09.json</code>.
                L’impronta curricolare deve essere materializzata prima di un’eventuale esecuzione reale.
              </p>
            </div>

            <ol className={styles.sequence}>
              {sequence.map(([label, value], index) => (
                <li key={label}>
                  <span className={styles.number}>{index + 1}</span>
                  <span>{label}</span>
                  <span className={styles.minutes}><Clock3 aria-hidden="true" />{value}′</span>
                </li>
              ))}
            </ol>
          </section>

          <aside className={styles.side}>
            <section className={styles.card}>
              <p className={styles.eyebrow}>Scelta del docente</p>
              <h2>Durata</h2>
              <div className={styles.choiceRow}>
                {[60, 90, 120].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={minutes === value}
                    className={minutes === value ? styles.activeChoice : styles.choice}
                    onClick={() => chooseMinutes(value)}
                  >
                    {value} min
                  </button>
                ))}
              </div>
              <p className={styles.helper}>
                Nel pilota la proposta originaria è stata adattata da 120 a 60 minuti.
                La scelta qui resta soltanto locale alla pagina.
              </p>
            </section>

            <section className={styles.card}>
              <p className={styles.eyebrow}>Stato della simulazione</p>
              <div className={styles.state}>
                <RefreshCw aria-hidden="true" />
                <div>
                  <strong>{revalidated ? "Rivalidazione simulata completata" : "In attesa della decisione finale"}</strong>
                  <p>Nessun dato viene salvato o trasmesso.</p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <p className={styles.eyebrow}>Materiali</p>
              <h2>Ogni elemento mostra da dove proviene</h2>
            </div>
            <span className={styles.visibleCheck}>Controllo provenienza: visibile</span>
          </div>

          <div className={styles.materialGrid}>
            <article>
              <Source source="Docente OS" />
              <h3>Sintesi docente</h3>
              <p>Traccia per introdurre il sistema agricolo, guidare l’osservazione e accompagnare lo schema sul quaderno.</p>
              <small>Riferimento: CAN-PACK-2A</small>
            </article>

            <article>
              <Source source="Docente OS" />
              <h3>Scheda alunno</h3>
              <p>Struttura guidata per riconoscere input, processo e output senza introdurre dati personali.</p>
              <small>Riferimento: Scheda 2A-1</small>
            </article>

            <article className={styles.atlasMaterial}>
              <div className={styles.cardHead}>
                <Source source="Atlas" />
                <small>Proposta, non selezione automatica</small>
              </div>
              <h3>Supporto visuale: paesaggio agricolo</h3>
              <p>Criteri: campi, acqua o irrigazione, viabilità, edifici e mezzi tecnici.</p>
              <div className={styles.choiceRow}>
                {[
                  ["MANTIENI", "Mantieni proposta"],
                  ["SOSTITUISCI", "Sostituisci"],
                  ["ESCLUDI", "Escludi"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={visualDecision === value}
                    className={visualDecision === value ? styles.activeAtlasChoice : styles.atlasChoice}
                    onClick={() => chooseVisual(value as VisualDecision)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className={styles.decision}>Decisione simulata: {visualDecisionLabel}.</p>
            </article>

            <article className={styles.fullWidth}>
              <Source source="Docente OS" />
              <h3>Verifica finale</h3>
              <p>Mappa input → processo → output e frase conclusiva: “Un sistema agricolo funziona perché…”.</p>
            </article>
          </div>
        </section>

        <section className={styles.finalCheck}>
          <div>
            <p className={styles.kicker}>CONTROLLO FINALE DEL DOCENTE</p>
            <h2>Rivalida la preparazione simulata</h2>
            <p>
              Durata scelta: {minutes} minuti · supporto Atlas: {visualDecisionLabel}.
              Il comando non pubblica, non salva e non avvia attività reali.
            </p>
          </div>
          <button type="button" onClick={() => setRevalidated(true)}>Simula rivalidazione</button>
          {revalidated ? (
            <div className={styles.success}>
              <CheckCircle2 aria-hidden="true" />
              <span>
                Simulazione completata. Per una lezione reale restano necessari impronta curricolare,
                risorsa visuale definitiva, data/orario e conferma esplicita del docente.
              </span>
            </div>
          ) : null}
        </section>

        <footer className={styles.footer}>
          ECO-02/P1 · Tecnologia 2C · pagina dimostrativa statica · nessun dato personale degli alunni.
        </footer>
      </div>
    </main>
  )
}
