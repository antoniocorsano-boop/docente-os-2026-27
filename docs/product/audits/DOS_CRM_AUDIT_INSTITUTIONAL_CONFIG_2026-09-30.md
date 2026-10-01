# DOS-CRM Audit — Institutional Configurator
Data: **2026-09-30**  
Capability ID: `DOS-INSTITUTIONAL-CONFIG`  
Baseline: `develop@74290511ee58a6b61652160463461527e3e0f57a`  
Esito: **CRL 1 — DEFINED / CONDITIONAL / CURRENT**

## Evidence
- `INSTITUTIONAL_INTEGRATION_CONFIGURATOR_CANONICAL.md`;
- policy model per PERSONAL_LOCAL_FIRST / GOOGLE_WORKSPACE_EDU / MICROSOFT_365_EDU / HYBRID;
- confini consent, scopes, data tier, AI/voice policy e receipt definiti;
- relazione con Settings e deployment model documentata.

## Assi
| F | UX | D | S | I | Q | O | K |
|---:|---:|---:|---:|---:|---:|---:|---:|
| **1** | **1** | **2** | **3** | **2** | **1** | **1** | **5** |

## Decisione
La capability è ben definita sul piano canonico ma non deve essere trattata come requisito del pilot personale. L'implementazione istituzionale/multi-tenant richiede autorizzazione separata.

`CRL 1 / DEFINED / CONDITIONAL / CURRENT`.

La promozione inizia solo quando viene autorizzato un perimetro istituzionale concreto, con institution binding, consent, policy versionata e tenant isolation verificabili.


## Rettifica assi DOS-CRM — 2026-10-01

Finché non esiste un pilot istituzionale autorizzato né implementazione eseguibile di institution binding, consent lifecycle, tenant isolation e data/security plane, gli assi F/UX/D/S/I/Q/O restano al livello **1 — DEFINED**. Solo K può essere superiore in virtù della documentazione/governance disponibile. Nessun prototipo o livello implementato viene inferito dalla sola specifica.
