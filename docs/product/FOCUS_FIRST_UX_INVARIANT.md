# DOCENTE OS — Focus-first UX invariant

**Data:** 2026-09-23  
**Stato:** CANONICAL PRODUCT INVARIANT  
**Ambito:** tutte le superfici operative Docente OS  
**Origine:** R4-P2/S1 mobile human-use review

## Principio

> Una vista non deve mostrare tutto ciò che il sistema sa. Deve mostrare ciò che il docente deve capire o decidere adesso.

La completezza informativa non giustifica una vista lunga, densa o cognitivamente dispersiva.

## Regole canoniche

1. **Un compito cognitivo principale per volta.**
2. **Progressive disclosure** per dettagli, fonti, risorse secondarie e opzioni avanzate.
3. **No vertical encyclopedia**: evitare colonne continue di card pertinenti ma simultanee.
4. **Primary before secondary**: stato, decisione e prossima azione prima del contesto.
5. **Preserve context, reduce repetition**.
6. **Short mobile path** verso l’azione primaria.
7. **No sticky obstruction**.
8. **Human control remains explicit**: compattare non significa fondere consensi distinti.
9. **Secondary content remains accessible**.
10. **Measure task cost, not page completeness**.

## Applicazione alla lezione

- **Prepara**: brief operativo prima del dettaglio.
- **In classe**: un passo della sequenza alla volta.
- **Osserva**: poche evidenze utili, osservazione professionale facoltativa.
- **Registra**: Dati essenziali → Riflessione facoltativa → Conferma.

## Gate di design

Ogni PR che modifica una superficie operativa deve dichiarare:
- compito cognitivo principale;
- contenuto primario;
- contenuto relegato a progressive disclosure;
- effetto sullo scroll;
- eventuale variazione dei consensi;
- comportamento mobile.

## Non obiettivi

L’invariante non autorizza rimozione di provenance, occultamento di errori o stati rilevanti, automazioni implicite, perdita di accessibilità o riduzione della trasparenza.
