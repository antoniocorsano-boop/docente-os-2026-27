# DOS-CRM Audit — Account / MFA / sessioni
Data: **2026-09-30**  
Capability ID: `DOS-ACCOUNT-SECURITY`  
Baseline di consultazione: `develop@74290511ee58a6b61652160463461527e3e0f57a`  
Esito: **CRL 5 — QUALIFIED / RECENT**

## Evidence
- `ACCOUNT_SECURITY_EXPERIENCE_CONTRACT.md`;
- `ASVS_5_0_ASSURANCE_CANONICAL.md`;
- PR #346 MFA TOTP + AAL2 boundary;
- PR #348 Account e sicurezza in UI autenticata;
- PR #364 consolidamento Account/repository hygiene;
- data-plane enforcement AAL2, Browser Gate reale, TOTP errato/valido;
- recovery reale via email, password mutation dopo AAL2, logout/re-login e ritorno alla superficie Oggi;
- receipt provider/runtime e deploy exact-head;
- V6.3.3 `CLOSED_VERIFIED`.

## Assi
| F | UX | D | S | I | Q | O | K |
|---:|---:|---:|---:|---:|---:|---:|---:|
| **5** | **5** | **5** | **6** | **5** | **5** | **5** | **5** |

## Limite
La capability specifica Account/MFA è qualificata. Non viene elevata a CRL 6 perché l'ASVS L1/L2 complessivo del prodotto resta PARTIAL e non abbiamo evidence longitudinale sufficiente per dichiarare l'intero dominio Account/Sicurezza operativo/provato oltre la qualification.

## Promozione
Per CRL 6: evidence sostenuta di operatività/recovery su release candidate e nessun finding account/session critico aperto.
