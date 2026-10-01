# DOS-CRM QL-1 — Daily Teaching Loop Qualification

Data: **2026-09-30**  
Lane: **QL-1**  
Baseline di partenza: `develop@1d8c4ee7c1209f624b412db1b11e666c2de25aaa`

## Scopo

Qualificare come un unico journey professionale le capability:

- `DOS-TODAY-NEXT`
- `DOS-TIMETABLE`
- `DOS-CALENDAR`
- `DOS-LESSON-PREP`
- `DOS-TEACHING-SESSION`
- `DOS-PLAN-UDA`

senza duplicare test browser già maturi.

## Journey

`Home/Today → Orario/Calendario → Classe → Prima della lezione/materiali → In classe → Registra → Resoconto → Domani`

## Evidence browser riusata

Una singola invocazione Playwright, con global setup condiviso, esegue:

1. `surfaces.spec.mjs` — superfici principali, inclusi Orario, Calendario, Piano/Home;
2. `critical-journeys.spec.mjs` — Classe, UDA/prepare, Calendario;
3. `classroom-cockpit.spec.mjs` — task corrente e supporti in classe;
4. `lesson-materials.spec.mjs` — accesso contestuale e RoleView materiali;
5. `lesson-register.spec.mjs` — Diario/In classe/Registra;
6. `day-review.spec.mjs` — chiusura giornata e preparazione del giorno successivo;
7. `tomorrow-materials.spec.mjs` — pacchetti governati delle lezioni di domani.

La suite viene eseguita su entrambi i progetti già canonici:
- mobile 412×915;
- desktop 1440×1000.

## Receipt

Il workflow genera:

`product/test-results/dos-crm/QL-1.json`

legata all'exact SHA testato.

La receipt automatica mantiene:
- browser result;
- capability attraversate;
- evidence refs;
- `human_review=PENDING`;
- `human_use=NOT_RUN`.

Quindi un PASS automatico **non promuove da solo** alcuna capability a CRL 5.

## Criteri di technical PASS

- build exact-head;
- runtime locale avviato;
- credenziale E2E governata;
- tutte le sette spec PASS;
- nessun test saltato trasformato artificialmente in PASS;
- artifact/receipt pubblicati.

## Human boundary

Dopo il technical PASS:
1. review indipendente sullo stesso exact head;
2. Human Review;
3. solo allora il DOS-CRM può usare QL-1 come evidence di promozione;
4. HUMAN_USE resta un requisito distinto per gli assi che la richiedono.

## Anti-duplication

QL-1 non introduce una seconda implementazione degli scenari. Orchestration e receipt sono nuove; i test di prodotto rimangono quelli già autorevoli.
