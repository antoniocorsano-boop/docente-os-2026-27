'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { LessonMaterialRenderBundle } from '@/core/presentation/lesson-material-renderer'
import type { RoleViewSnapshot } from '@/core/presentation/roleview-governance'
import { RoleViewTeacherPanel } from './roleview-teacher-panel'
import styles from './lesson-materials.module.css'
import visualStyles from './lesson-materials-visual.module.css'

type MaterialView = 'lim' | 'visuale' | 'scheda' | 'docente'

export default function LessonMaterialsClient({
  bundle,
  roleView,
  sectionLabel,
  timeLabel,
  authority,
  initialView,
}: {
  bundle: LessonMaterialRenderBundle
  roleView: RoleViewSnapshot
  sectionLabel: string
  timeLabel: string
  authority: 'IN_FORCE' | 'PROVISIONAL_DRAFT'
  initialView: Exclude<MaterialView, 'visuale'>
}) {
  const [view, setView] = useState<MaterialView>(initialView)
  const [activeScreen, setActiveScreen] = useState(0)
  const screens = bundle.limView.screens
  const currentScreen = screens[activeScreen] ?? screens[0]
  const isFirst = activeScreen === 0
  const isLast = activeScreen >= screens.length - 1
  const viewTitle = view === 'lim'
    ? 'Proietta'
    : view === 'visuale'
      ? 'Mappa visuale'
      : view === 'scheda'
        ? 'Scheda studenti'
        : 'Guida docente'

  useEffect(() => {
    if (view !== 'lim') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault()
        setActiveScreen((value) => Math.min(screens.length - 1, value + 1))
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        setActiveScreen((value) => Math.max(0, value - 1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [screens.length, view])

  const progressLabel = useMemo(
    () => screens.length ? `${activeScreen + 1} di ${screens.length}` : 'Nessuna schermata',
    [activeScreen, screens.length],
  )

  return (
    <main className={styles.surface}>
      <header className={styles.header}>
        <div>
          <Link className={styles.back} href="/planner">← Oggi</Link>
          <p className={styles.eyebrow}>MATERIALI DELLA PROSSIMA LEZIONE</p>
          <h1>{bundle.teacherBrief.title}</h1>
          <p className={styles.contextLine}>
            <strong>{sectionLabel}</strong>{timeLabel ? ` · ${timeLabel}` : ''}
            {authority === 'PROVISIONAL_DRAFT' ? ' · Orario provvisorio' : ''}
          </p>
        </div>
      </header>

      <RoleViewTeacherPanel roleView={roleView} />

      <nav className={styles.viewNav} aria-label="Scegli la vista dei materiali">
        <button type="button" aria-pressed={view === 'lim'} onClick={() => setView('lim')}>Proietta</button>
        <button type="button" aria-pressed={view === 'visuale'} onClick={() => setView('visuale')}>Mappa visuale</button>
        <button type="button" aria-pressed={view === 'scheda'} onClick={() => setView('scheda')}>Scheda studenti</button>
        <button type="button" aria-pressed={view === 'docente'} onClick={() => setView('docente')}>Guida docente</button>
      </nav>

      <div className={styles.viewHeading}>
        <h2>{viewTitle}</h2>
        {view === 'scheda' && bundle.studentHandouts.length > 0 ? (
          <button className={styles.printButton} type="button" onClick={() => window.print()}>Stampa</button>
        ) : null}
      </div>

      {view === 'lim' ? (
        <section className={styles.limView} aria-labelledby="lim-screen-title">
          {currentScreen ? (
            <article className={styles.limScreen} aria-live="polite">
              <div className={styles.limCounter}>SCHERMATA {progressLabel}</div>
              <h2 id="lim-screen-title">{currentScreen.title}</h2>
              <div className={styles.limBody}>
                {currentScreen.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {currentScreen.cue ? <p className={styles.limCue}>{currentScreen.cue}</p> : null}
              {currentScreen.minutes !== null ? <p className={styles.limTime}>{currentScreen.minutes} min</p> : null}
            </article>
          ) : (
            <p className={styles.emptyMessage}>Nessuna schermata disponibile.</p>
          )}

          <div className={styles.screenControls} role="group" aria-label="Controlli proiezione">
            <button type="button" disabled={isFirst} onClick={() => setActiveScreen((value) => Math.max(0, value - 1))}>Indietro</button>
            <div className={styles.screenDots} aria-hidden>
              {screens.map((screen, index) => <span key={screen.id} data-active={index === activeScreen ? 'true' : 'false'} />)}
            </div>
            <button type="button" disabled={isLast} onClick={() => setActiveScreen((value) => Math.min(screens.length - 1, value + 1))}>Avanti</button>
          </div>
          <p className={styles.keyboardHint}>Puoi usare anche i tasti freccia sinistra e destra.</p>
        </section>
      ) : null}

      {view === 'visuale' ? (
        <section className={visualStyles.visualView} aria-label="Mappa visuale della lezione">
          <article className={visualStyles.visualMap}>
            <header>
              <p className={styles.eyebrow}>PERCORSO DELLA LEZIONE</p>
              <h2>{bundle.visualAid.title}</h2>
              <p>Una vista d’insieme pronta da proiettare per orientare la classe prima di iniziare.</p>
            </header>
            <ol className={visualStyles.visualSteps}>
              {bundle.visualAid.items.map((item) => (
                <li className={visualStyles.visualStep} key={`${item.ordinal}-${item.label}`}>
                  <span className={visualStyles.visualOrdinal} aria-hidden>{item.ordinal}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.minutes === null ? 'Tempo adattabile' : `${item.minutes} min`}</span>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        </section>
      ) : null}

      {view === 'scheda' ? (
        <section className={styles.studentView} aria-label="Schede studenti stampabili">
          {bundle.studentHandouts.length ? bundle.studentHandouts.map((handout) => (
            <article className={styles.handout} key={handout.ref}>
              <header>
                <p className={styles.handoutLabel}>TECNOLOGIA · {sectionLabel}</p>
                <h2>{handout.title}</h2>
                <p>{handout.instruction}</p>
              </header>
              {handout.prompts.length ? (
                <ol className={styles.promptList}>
                  {handout.prompts.map((prompt) => (
                    <li key={prompt}>
                      <strong>{prompt}</strong>
                      <div className={styles.answerSpace} aria-hidden />
                    </li>
                  ))}
                </ol>
              ) : (
                <div className={styles.freeWorkArea}>
                  <p>Spazio di lavoro</p>
                </div>
              )}
            </article>
          )) : (
            <div className={styles.emptyMessage}>
              <h2>Nessuna scheda studenti pronta.</h2>
              <p>Il sistema non crea consegne che non siano già presenti o accettate nel manifesto della lezione.</p>
            </div>
          )}
        </section>
      ) : null}

      {view === 'docente' ? (
        <section className={styles.teacherView} aria-label="Guida docente">
          <article className={styles.teacherCard}>
            <p className={styles.eyebrow}>OBIETTIVO</p>
            <h2>{bundle.teacherBrief.objective}</h2>
          </article>

          <div className={styles.teacherGrid}>
            <section className={styles.teacherCard}>
              <h3>Da predisporre</h3>
              {bundle.teacherBrief.preparation.length ? (
                <ul>{bundle.teacherBrief.preparation.map((item) => <li key={item}>{item}</li>)}</ul>
              ) : <p>Nessuna preparazione specifica indicata.</p>}
            </section>
            <section className={styles.teacherCard}>
              <h3>Già pronto</h3>
              {bundle.teacherBrief.readyMaterials.length ? (
                <ul>{bundle.teacherBrief.readyMaterials.map((item) => <li key={item}>{item}</li>)}</ul>
              ) : <p>Nessun materiale aggiuntivo segnalato.</p>}
            </section>
          </div>

          <section className={styles.sequenceCard}>
            <h3>Sequenza della lezione</h3>
            <ol>
              {bundle.teacherBrief.sequence.map((step) => (
                <li key={step.id}>
                  <div>
                    <strong>{step.title}</strong>
                    <span>{step.minutes === null ? 'Tempo adattabile' : `${step.minutes} min`}</span>
                  </div>
                  <p>{step.instruction}</p>
                  {step.cue ? <small>{step.cue}</small> : null}
                </li>
              ))}
            </ol>
          </section>

          {bundle.teacherBrief.attention.length ? (
            <section className={styles.attentionCard} aria-labelledby="materials-attention-title">
              <h3 id="materials-attention-title">Da verificare</h3>
              <ul>{bundle.teacherBrief.attention.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ) : null}
        </section>
      ) : null}
    </main>
  )
}
