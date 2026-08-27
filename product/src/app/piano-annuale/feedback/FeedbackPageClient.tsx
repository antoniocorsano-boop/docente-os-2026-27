'use client'

import { useMemo, useState } from 'react'
import type { AnnualPlanGrade } from '@/core/domain/annual-plan-execution'
import CurriculumFeedbackRelay from '../CurriculumFeedbackRelay'

type SectionOption = {
  id: string
  grade: AnnualPlanGrade
  sectionCode: string
}

export default function FeedbackPageClient({ sections }: { sections: SectionOption[] }) {
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '')
  const selected = useMemo(() => sections.find((section) => section.id === sectionId) ?? null, [sectionId, sections])

  if (sections.length === 0) {
    return <div className="humanTaskFocus"><h2>Nessuna sezione disponibile</h2><p>Aggiungi prima una sezione nel Piano annuale.</p></div>
  }

  return (
    <>
      <section className="annualContextPanel annualContextCompact">
        <div className="annualSelectors">
          <label>
            <span>Sezione a cui si riferisce l’osservazione</span>
            <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
              {sections.map((section) => <option key={section.id} value={section.id}>{gradeLabel(section.grade)} {section.sectionCode}</option>)}
            </select>
          </label>
        </div>
      </section>
      {selected ? <CurriculumFeedbackRelay key={selected.id} sectionId={selected.id} sectionLabel={`${gradeLabel(selected.grade)} ${selected.sectionCode}`} /> : null}
    </>
  )
}

function gradeLabel(grade: AnnualPlanGrade) {
  if (grade === 'FIRST') return 'Prima'
  if (grade === 'SECOND') return 'Seconda'
  return 'Terza'
}
