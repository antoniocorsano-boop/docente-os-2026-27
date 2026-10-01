# DOS-CRM Audit — Calendario / composizione temporale
Data: **2026-09-30**  
Capability ID: `DOS-CALENDAR`  
Baseline: `develop@74290511ee58a6b61652160463461527e3e0f57a`  
Esito: **CRL 4 — INTEGRATED / CURRENT**

## Evidence
- `TEMPORAL_COMPOSITION_CANONICAL_SPEC.md`;
- Calendar core indipendente (PR #93) e composizione con Orario in Oggi (PR #94);
- agenda operativa locale (PR #257);
- server-side hardening (PR #510);
- DOS-CAL-01 circolari → proposta → conferma → Calendario (PR #569), Human Review PASS;
- temporal exceptions e teacher-first Today cockpit (PR #592);
- command guards e test applicativi.

## Assi
| F | UX | D | S | I | Q | O | K |
|---:|---:|---:|---:|---:|---:|---:|---:|
| **5** | **4** | **5** | **5** | **5** | **4** | **4** | **5** |

## Limite
La sub-capability DOS-CAL-01 è stata qualificata con Human Review, ma il Calendario complessivo non ha ancora una singola qualification end-to-end corrente che comprenda eventi, eccezioni, agenda, composizione con Orario e recovery.

## Promozione
CRL 5 richiede roll-up unico del Calendario su exact SHA con Browser Certification, test delle eccezioni e Human Review.
