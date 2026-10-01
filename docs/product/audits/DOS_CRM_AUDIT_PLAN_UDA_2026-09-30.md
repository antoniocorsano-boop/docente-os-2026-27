# DOS-CRM Audit — Piano annuale / UDA
Data: **2026-09-30**  
Capability ID: `DOS-PLAN-UDA`  
Baseline: `develop@74290511ee58a6b61652160463461527e3e0f57a`  
Esito: **CRL 4 — INTEGRATED / CURRENT**

## Evidence
- `docs/architecture/ANNUAL_EXECUTION_PLAN.md`;
- modello runtime `product/src/app/piano-annuale/model.ts` con 33 blocchi / 66 ore per grado e test;
- `SupabaseAnnualPlanExecutionRepository`;
- UI `AnnualPlanClient.tsx`;
- integrazione Human Task, UDA-only/PLAN-guided recipes e source binding;
- PR #239/#240/#242: curriculum context, persistence/revalidation;
- PR #538: H9-A consumo governato delle decisioni di replanning accettate;
- integrazione con Lesson Preparation e TeachingSession.

## Assi
| F | UX | D | S | I | Q | O | K |
|---:|---:|---:|---:|---:|---:|---:|---:|
| **5** | **4** | **5** | **5** | **5** | **4** | **4** | **5** |

## Limite
Il canone, la persistenza e le integrazioni sono forti. Mancano però una qualification unificata della superficie Piano/UDA sullo SHA corrente, HUMAN_USE mirata sull'intero journey di avanzamento/rimodulazione e una receipt operativa completa.

## Promozione
CRL 5 richiede critical journey Piano → blocco → avanzamento → replanning → preparazione → TeachingSession, Browser Certification e Human Review sullo stesso exact SHA.
