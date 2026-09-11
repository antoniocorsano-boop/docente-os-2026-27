# DOCENTE OS — DailyTeacherBrief data contract

Stato: DRAFT / DA VALIDARE CONTRO IL CODICE ESISTENTE

Il modello `DailyTeacherBrief` deve essere una proiezione derivata, non una nuova source of truth.

```ts
export type DailyTeacherBrief = {
  date: string
  generatedAt: string
  dayPhase: 'BEFORE_SCHOOL' | 'TEACHING' | 'BETWEEN_ACTIVITIES' | 'AFTER_SCHOOL'
  timeline: DailyTimelineItem[]
  nextItem: DailyTimelineItem | null
  preparationSummary: {
    ready: number
    needsConfirmation: number
    incomplete: number
    updating: number
    retry: number
  }
  nextAction: DailyNextAction | null
}

export type DailyTimelineItem = {
  id: string
  kind: 'LESSON' | 'EVENT' | 'DEADLINE' | 'TASK'
  startsAt?: string | null
  endsAt?: string | null
  title: string
  contextLabel?: string | null
  preparation?: 'READY' | 'NEEDS_CONFIRMATION' | 'INCOMPLETE' | 'UPDATING' | 'RETRY' | null
  href?: string | null
  sourceRefs: Array<{
    source: 'TIMETABLE' | 'CALENDAR' | 'PLANNER' | 'ANNUAL_PLAN' | 'KNOWLEDGE'
    ref: string
  }>
}

export type DailyNextAction = {
  label: string
  href: string
  reason: string
}
```

## Invarianti

1. Nessun dato operativo viene duplicato come autorevole nel brief.
2. Ogni elemento mantiene almeno un riferimento alla fonte.
3. Una sola `nextAction` è esposta come primaria.
4. Lo stato `NEEDS_CONFIRMATION` è ammesso solo quando esiste una decisione professionale realmente pendente.
5. `READY` non può essere dedotto soltanto dall'esistenza di una proposta dell'assistente.
6. Il brief deve poter essere ricostruito deterministicamente dalle fonti correnti.
7. Le notifiche usano una riduzione del brief, non un proprio modello parallelo.
