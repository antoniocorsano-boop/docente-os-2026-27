import type { DocumentTemplateVersionDraft, TemplateField } from '../domain/document-template'

const identityFields: TemplateField[] = [
  field('academic_year.label', 'Anno scolastico', 'TEXT_SHORT', 'AUTO_DOCUMENTED', 'PROFESSIONAL_CONTEXT'),
  field('class.label', 'Classe e sezione', 'TEXT_SHORT', 'AUTO_DOCUMENTED', 'PROFESSIONAL_CONTEXT'),
  field('discipline.label', 'Disciplina', 'TEXT_SHORT', 'AUTO_DOCUMENTED', 'PROFESSIONAL_CONTEXT'),
  field('teacher.display_name', 'Docente', 'TEXT_SHORT', 'AUTO_DOCUMENTED', 'PROFESSIONAL_CONTEXT'),
]

export const FINAL_REPORT_CANONICAL_TEMPLATE_V1: DocumentTemplateVersionDraft = {
  kind: 'FINAL_REPORT',
  name: 'Relazione finale del docente',
  version: 1,
  sourceRevisionRefs: [],
  sections: [
    {
      key: 'IDENTITY',
      label: 'Intestazione',
      purpose: 'Identificare con chiarezza il contesto professionale della relazione.',
      required: true,
      repeatable: false,
      renderRole: 'KEY_VALUE',
      fields: identityFields,
    },
    {
      key: 'CLASS_PROFILE',
      label: 'Profilo e andamento della classe',
      purpose: 'Descrivere in forma sintetica partecipazione, autonomia, ritmo di lavoro e clima della classe.',
      required: true,
      repeatable: false,
      renderRole: 'PARAGRAPH',
      fields: [
        field('class.profile.summary', 'Quadro complessivo della classe', 'TEXT_LONG', 'TEACHER_INPUT', 'PROFESSIONAL_CONTEXT'),
      ],
    },
    {
      key: 'EXECUTED_PATH',
      label: 'Percorso didattico effettivamente svolto',
      purpose: 'Sintetizzare il percorso realizzato senza duplicare integralmente la programmazione annuale.',
      required: true,
      repeatable: false,
      renderRole: 'TABLE',
      fields: [
        {
          ...field('learning.executed_path', 'Percorso svolto', 'TABLE', 'TEACHER_CONFIRMATION', 'PROFESSIONAL_CONTEXT'),
          helpText: 'Organizzare per ambiti o nuclei, conoscenze e contenuti, abilità sviluppate e competenze perseguite.',
        },
      ],
    },
    {
      key: 'OUTCOMES',
      label: 'Esiti del percorso',
      purpose: 'Restituire una sintesi professionale dei progressi osservati, degli aspetti consolidati e di quelli da rafforzare.',
      required: true,
      repeatable: false,
      renderRole: 'PARAGRAPH',
      fields: [
        field('learning.outcomes_summary', 'Sintesi degli esiti', 'TEXT_LONG', 'TEACHER_CONFIRMATION', 'PROFESSIONAL_CONTEXT'),
      ],
    },
    {
      key: 'METHODS_TOOLS_INCLUSION',
      label: 'Metodologie, strumenti e inclusione',
      purpose: 'Raccogliere le scelte metodologiche e gli strumenti effettivamente utilizzati e descrivere gli adattamenti generali pertinenti.',
      required: true,
      repeatable: false,
      renderRole: 'CHECKLIST',
      fields: [
        {
          ...field('methods.selected', 'Metodologie utilizzate', 'MULTI_SELECT', 'TEACHER_CONFIRMATION', 'PROFESSIONAL_CONTEXT'),
          cardinality: 'MANY',
          options: [
            option('LABORATORY', 'Didattica laboratoriale'),
            option('DIALOGUE', 'Lezione dialogata'),
            option('PROBLEM_SOLVING', 'Problem solving'),
            option('GRAPHIC_PRACTICE', 'Esercitazioni grafiche'),
            option('INDIVIDUAL', 'Lavoro individuale'),
            option('COLLABORATIVE', 'Lavoro a coppie o in gruppo'),
          ],
        },
        field('tools.summary', 'Strumenti e materiali significativi', 'TEXT_LONG', 'TEACHER_CONFIRMATION', 'PROFESSIONAL_CONTEXT'),
        field('inclusion.summary', 'Scelte inclusive e adattamenti generali', 'TEXT_LONG', 'TEACHER_INPUT', 'PROFESSIONAL_CONTEXT', false),
      ],
    },
    {
      key: 'ASSESSMENT',
      label: 'Verifica e valutazione',
      purpose: 'Descrivere le principali modalità di verifica utilizzate e il raccordo tra attività, obiettivi ed evidenze raccolte.',
      required: true,
      repeatable: false,
      renderRole: 'CHECKLIST',
      fields: [
        {
          ...field('assessment.methods', 'Modalità di verifica', 'MULTI_SELECT', 'TEACHER_CONFIRMATION', 'PROFESSIONAL_CONTEXT'),
          cardinality: 'MANY',
          options: [
            option('PRACTICAL', 'Prove pratiche'),
            option('GRAPHIC', 'Elaborati grafici'),
            option('WRITTEN', 'Prove scritte'),
            option('ORAL', 'Colloqui e interventi orali'),
            option('ACTIVITY_OBSERVATION', 'Osservazione delle attività'),
            option('AUTHENTIC_TASK', 'Compiti autentici o di realtà'),
          ],
        },
        field('assessment.coherence_summary', 'Sintesi valutativa', 'TEXT_LONG', 'TEACHER_CONFIRMATION', 'PROFESSIONAL_CONTEXT'),
      ],
    },
    {
      key: 'CIVIC_TRANSVERSAL',
      label: 'Educazione civica e raccordi trasversali',
      purpose: 'Documentare soltanto le attività trasversali effettivamente pertinenti al percorso svolto.',
      required: false,
      repeatable: false,
      visibilityRule: 'WHEN_RELEVANT',
      renderRole: 'PARAGRAPH',
      fields: [
        field('civic_transversal.summary', 'Attività e raccordi trasversali', 'TEXT_LONG', 'TEACHER_CONFIRMATION', 'PROFESSIONAL_CONTEXT', false),
      ],
    },
    {
      key: 'FINAL_REFLECTION',
      label: 'Considerazioni conclusive',
      purpose: 'Sintetizzare andamento complessivo, elementi significativi, criticità residue ed eventuali indicazioni per la continuità.',
      required: true,
      repeatable: false,
      renderRole: 'PARAGRAPH',
      fields: [
        field('final.reflection', 'Considerazioni finali', 'TEXT_LONG', 'TEACHER_INPUT', 'PROFESSIONAL_CONTEXT'),
      ],
    },
    {
      key: 'SIGNATURE',
      label: 'Luogo, data e firma',
      purpose: 'Concludere il documento con gli elementi formali essenziali.',
      required: true,
      repeatable: false,
      renderRole: 'SIGNATURE_BLOCK',
      fields: [
        field('document.place', 'Luogo', 'TEXT_SHORT', 'TEACHER_INPUT', 'PROFESSIONAL_CONTEXT'),
        field('document.date', 'Data', 'DATE', 'TEACHER_CONFIRMATION', 'PROFESSIONAL_CONTEXT'),
        field('document.signature', 'Firma del docente', 'SIGNATURE', 'TEACHER_INPUT', 'PROFESSIONAL_CONTEXT'),
      ],
    },
  ],
}

export function finalReportCanonicalTemplate(): DocumentTemplateVersionDraft {
  return structuredClone(FINAL_REPORT_CANONICAL_TEMPLATE_V1)
}

function field(
  key: string,
  label: string,
  type: TemplateField['type'],
  valuePolicy: TemplateField['valuePolicy'],
  privacyClass: TemplateField['privacyClass'],
  required = true,
): TemplateField {
  return {
    key,
    label,
    type,
    required,
    cardinality: 'ONE',
    valuePolicy,
    privacyClass,
  }
}

function option(value: string, label: string) {
  return { value, label }
}
