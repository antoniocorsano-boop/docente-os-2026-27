# DOCENTE OS — Strategia notifiche quotidiane

Stato: DRAFT / NON IMPLEMENTATIVO

## Obiettivo

Preparare un riepilogo mattutino configurabile senza introdurre subito un'infrastruttura push non ancora verificata.

## Fase 1 — preferenza e fallback in-app

- preferenza attiva/disattiva;
- ora desiderata;
- giorni attivi;
- riepilogo disponibile in Oggi;
- banner discreto in-app se il riepilogo non è stato ancora consultato.

## Fase 2 — browser notification

Solo dopo verifica di compatibilità, persistenza del consenso e comportamento su mobile:

- richiesta permesso contestuale e non al primo accesso;
- service worker dedicato se necessario;
- payload minimale senza dati personali degli alunni;
- click verso `/oggi`;
- deduplicazione per data/utente;
- fallback in-app.

## Fase 3 — canali aggiuntivi

Eventuali canali ulteriori richiedono decisione separata, poiché implicano provider, credenziali, trattamento dati e affidabilità operativa differenti.

## Regola

La notifica non deve essere la source of truth. È soltanto una proiezione breve di `DailyTeacherBrief`.
