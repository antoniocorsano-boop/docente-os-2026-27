# RUNTIME-01R3 — review checklist

Prima di qualunque merge:

- [ ] Product CI / typecheck PASS
- [ ] nessuna modifica a schema o migration
- [ ] compare-and-set verifica stato e `updated_at` osservati
- [ ] conflitto stale non sovrascrive lo stato corrente
- [ ] doppio invio bloccato nel controllo con feedback
- [ ] successo, conflitto ed errore sono percettibili
- [ ] `page.tsx` resta invariato finché non è disponibile un diff chirurgico verificabile
- [ ] nessuna attivazione DOS-A1
- [ ] nessuna promozione STABLE
- [ ] exact head congelato dopo il completamento del collegamento finale
