# DOS-CRM Audit — Conoscenza / KB
Data: **2026-09-30**  
Capability ID: `DOS-KNOWLEDGE`  
Baseline: `develop@74290511ee58a6b61652160463461527e3e0f57a`  
Esito: **CRL 4 — INTEGRATED / CURRENT**

## Evidence
- `docs/architecture/KB_INGESTION.md`;
- schema KB, RLS, provenance immutabile, storage privato, generations e current-generation pointer;
- upload policy e content validation;
- ASVS V5.2.2 dichiarato `CLOSED_VERIFIED` nelle assurance canoniche;
- K1 Knowledge Upload Gate presente nelle qualification recenti;
- PR #267 collegamento risorse docente libro → Conoscenza;
- PR #281 recovery locale PDF testuali privacy-first;
- PR #422 retrieval governato della Conoscenza per Copilot;
- collegamento materiali alla preparazione lezione.

## Assi
| F | UX | D | S | I | Q | O | K |
|---:|---:|---:|---:|---:|---:|---:|---:|
| **5** | **4** | **5** | **5** | **5** | **5** | **4** | **5** |

## Limite
Sicurezza, dati e qualification tecnica sono forti. Il limite resta l'operatività complessiva del journey upload → processing → provenance → retrieval → riuso nella lezione e la HUMAN_USE della superficie Conoscenza nel suo insieme.

## Promozione
CRL 5 richiede una qualification unica del journey completo e Browser/HUMAN_USE sulla superficie corrente.
