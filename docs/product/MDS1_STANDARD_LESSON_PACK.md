# MDS-1 — Standard Lesson Pack v1

## Obiettivo

Rendere completamente fruibile il pacchetto didattico già prodotto dal renderer canonico della prossima lezione, senza introdurre un secondo motore, nuova persistenza o generazione esterna.

## Pacchetto standard

La superficie `/materiali/prossima` espone quattro viste dello stesso `LessonMaterialRenderBundle`:

1. **Proietta** — sequenza LIM guidata;
2. **Mappa visuale** — percorso sintetico della lezione già presente come `visualAid` nel bundle;
3. **Scheda studenti** — materiali stampabili autorizzati dal manifesto;
4. **Guida docente** — obiettivo, predisposizione, materiali pronti, sequenza e attenzioni.

## Invarianti

- una sola preparazione autorevole della prossima lezione;
- nessun nuovo database, API, provider AI, storage o source of truth;
- nessuna generazione di contenuti non presenti nel bundle canonico;
- RoleView e fail-closed invariati;
- responsive mobile e touch target coerenti con il sistema esistente;
- validazione HVA della nuova vista.

## Design classification

**COMPATIBLE** — estensione della superficie esistente con un artefatto già generato e non precedentemente esposto.
