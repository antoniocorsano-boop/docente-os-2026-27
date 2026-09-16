import Link from 'next/link'
import type { RoleViewSnapshot } from '@/core/presentation/roleview-governance'
import styles from './lesson-materials.module.css'

const MATERIAL_LABELS: Record<string, string> = {
  TEACHER_BRIEF: 'guida docente',
  LIM_VIEW: 'vista LIM',
  STUDENT_HANDOUT: 'scheda studenti',
  MINI_DECK: 'presentazione breve',
  VISUAL_AID: 'supporto visuale',
  ASSESSMENT: 'verifica formativa',
}

const BLOCKER_LABELS: Record<string, string> = {
  LESSON_SECTION_UNRESOLVED: 'La prossima lezione non è associata a una classe.',
  LESSON_CONTEXT_UNRESOLVED: 'Il contesto della prossima lezione non è disponibile.',
  CANONICAL_LESSON_UNRESOLVED: 'La prossima lezione non è collegata al Piano annuale.',
  LESSON_PROJECTION_UNRESOLVED: 'Il Lesson Brief della prossima lezione non è disponibile.',
  ACADEMIC_YEAR_UNRESOLVED: 'L’anno scolastico non è risolto.',
  TEMPORAL_AUTHORITY_UNSUPPORTED: 'L’orario della lezione non ha un’autorità temporale valida.',
  SECTION_BINDING_MISMATCH: 'La lezione non coincide con la classe attesa.',
  SECTION_LABEL_BINDING_MISMATCH: 'La classe della lezione non coincide con il riferimento canonico.',
  BLOCK_BINDING_MISMATCH: 'Il blocco della lezione non coincide con il Piano annuale.',
  LESSON_CONTENT_BINDING_MISMATCH: 'Il contenuto della lezione non coincide con la proiezione canonica.',
  PROJECTION_BLOCK_MISMATCH: 'La proiezione didattica non coincide con il blocco corrente.',
  PROJECTION_ID_MISMATCH: 'La proiezione didattica non coincide con la lezione corrente.',
}

const KPI_IDS = [
  'required_materials',
  'ready_required_materials',
  'missing_required_materials',
  'materials_requiring_review',
]

export function RoleViewTeacherPanel({ roleView }: { roleView: RoleViewSnapshot }) {
  const primary = primaryAction(roleView)
  const kpis = KPI_IDS
    .map((id) => roleView.kpis.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
  const blockers = unique(roleView.blockers.map((item) => humanizeBlocker(item.code, item.label)))
  const evidence = unique(roleView.evidence.map((item) => item.label ?? item.kind).filter(Boolean))

  return (
    <section className={styles.roleView} data-roleview-status={roleView.status.toLowerCase()} aria-labelledby="roleview-title">
      <div className={styles.roleViewLead}>
        <div>
          <p className={styles.roleViewEyebrow}>PREPARAZIONE · {statusLabel(roleView.status)}</p>
          <h2 id="roleview-title">{roleView.headline}</h2>
          <p>{teacherSummary(roleView.status)}</p>
        </div>
        <Link className={styles.roleViewPrimary} href={primary.href}>{primary.label}</Link>
      </div>

      {kpis.length ? (
        <dl className={styles.roleViewKpis} aria-label="Stato dei materiali">
          {kpis.map((kpi) => (
            <div key={kpi.id}>
              <dt>{shortKpiLabel(kpi.id, kpi.label)}</dt>
              <dd>{kpi.value}{typeof kpi.target === 'number' && kpi.id === 'ready_required_materials' ? `/${kpi.target}` : ''}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {blockers.length ? (
        <div className={styles.roleViewBlockers}>
          <strong>{roleView.status === 'BLOCKED' ? 'Cosa impedisce di procedere' : 'Cosa richiede attenzione'}</strong>
          <ul>{blockers.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : null}

      {evidence.length ? (
        <details className={styles.roleViewEvidence}>
          <summary>Perché DOCENTE OS mostra questo stato</summary>
          <ul>{evidence.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
      ) : null}
    </section>
  )
}

function statusLabel(status: RoleViewSnapshot['status']) {
  if (status === 'READY') return 'PRONTA'
  if (status === 'ATTENTION') return 'DA COMPLETARE'
  return 'BLOCCATA'
}

function teacherSummary(status: RoleViewSnapshot['status']) {
  if (status === 'READY') return 'Hai ciò che serve per entrare in classe. I dettagli restano disponibili senza appesantire la vista.'
  if (status === 'ATTENTION') return 'La lezione è individuata, ma ci sono materiali o decisioni da completare prima dell’uso.'
  return 'DOCENTE OS non considera pronta una preparazione che non riesce a collegare in modo affidabile alla lezione reale.'
}

function primaryAction(roleView: RoleViewSnapshot) {
  const governedAction = roleView.nextActions.find((action) => action.priority === 'PRIMARY' && action.href)
  if (governedAction?.href) return { label: governedAction.label, href: governedAction.href }
  if (roleView.status === 'READY') return { label: 'Proietta alla LIM', href: '?vista=lim' }
  if (roleView.status === 'ATTENTION') return { label: 'Apri guida docente', href: '?vista=docente' }
  return { label: 'Torna a Oggi', href: '/planner' }
}

function shortKpiLabel(id: string, fallback: string) {
  if (id === 'required_materials') return 'Richiesti'
  if (id === 'ready_required_materials') return 'Pronti'
  if (id === 'missing_required_materials') return 'Mancanti'
  if (id === 'materials_requiring_review') return 'Da validare'
  return fallback
}

function humanizeBlocker(code: string, label: string) {
  const exact = BLOCKER_LABELS[code]
  if (exact) return exact

  let value = label
  for (const [token, replacement] of Object.entries(MATERIAL_LABELS)) {
    value = value.replaceAll(token, replacement)
  }
  return value.replaceAll('_', ' ')
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}
