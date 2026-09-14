# DOCENTE OS — Institutional Integration Configurator

Data: **2026-09-14**  
Stato: **CANONICAL CANDIDATE**  
Issue: **#387**

## 1. Scopo

Definire come DOCENTE OS si adatta alle policy tecnologiche e di trattamento dati di un istituto senza diventare dipendente da un singolo ecosistema.

Principio:

> **La scuola sceglie provider, autorizzazioni e confini; DOCENTE OS applica quella policy e orchestra le capability consentite.**

Il configuratore istituzionale non è un pannello tecnico per il docente ordinario. È una policy di tenant/istituto amministrata da soggetti autorizzati.

## 2. Profili iniziali

### PERSONAL_LOCAL_FIRST

Uso personale/professionale del docente.

- nessuna integrazione istituzionale obbligatoria;
- storage e connector personali esplicitamente autorizzati;
- Tier 1 per default;
- nessuna assunzione di authority istituzionale.

### GOOGLE_WORKSPACE_EDU

Capability possibili:

- Google Identity / OAuth;
- Drive;
- Calendar;
- Docs/Sheets/Slides dove autorizzato;
- ulteriori API Workspace solo se abilitate dalla policy.

Regola di autorizzazione:

- OAuth user consent per dati dell'utente quando sufficiente;
- eventuale domain-wide delegation solo su decisione esplicita dell'amministratore Workspace;
- scopes minimi e documentati;
- nessuna impersonazione implicita;
- revoca e audit disponibili.

Google documenta che l'accesso server-to-server ai dati utente di Workspace mediante domain-wide delegation richiede autorizzazione amministrativa del dominio e scopes espliciti. L'uso deve quindi essere trattato come capability istituzionale sensibile, non come prerequisito di base del prodotto.

## 3. MICROSOFT_365_EDU

Capability possibili:

- Microsoft Entra identity;
- Microsoft Graph;
- SharePoint / OneDrive;
- Outlook / Calendar;
- Teams;
- Education APIs quando disponibili e autorizzate;
- School Data Sync come eventuale fonte di roster, senza trasformare DOCENTE OS in SIS.

Regola di autorizzazione:

- delegated permissions quando l'azione è eseguita nel contesto dell'utente;
- application permissions solo quando esiste un caso d'uso istituzionale esplicito;
- admin consent per permissions che lo richiedono;
- scopes minimi;
- possibilità di limitare l'app a utenti/gruppi autorizzati;
- audit di tenant, scopes e data access.

Microsoft Graph Education espone risorse per scuole, classi, utenti, assignment e roster. L'amministratore scolastico deve autorizzare le permissions richieste; questo rende il tenant consent un atto di governance, non un dettaglio tecnico.

## 4. HYBRID

Ammesso soltanto con matrice esplicita dei confini.

Esempio:

- identity Microsoft;
- documenti SharePoint;
- calendario Google non ammesso;
- AI provider esterno ammesso solo per contenuti Tier 1;
- raw audio non persistente.

Nessun fallback automatico da un provider all'altro quando ciò modificherebbe il data boundary.

## 5. InstitutionPolicy

Read model proposto:

```ts
interface InstitutionPolicy {
  institutionId: string
  mode: 'PERSONAL_LOCAL_FIRST' | 'GOOGLE_WORKSPACE_EDU' | 'MICROSOFT_365_EDU' | 'HYBRID'

  identityProvider: 'LOCAL' | 'GOOGLE' | 'MICROSOFT'

  capabilities: {
    drive?: boolean
    sharepoint?: boolean
    calendar?: boolean
    outlookCalendar?: boolean
    teams?: boolean
    email?: boolean
    documents?: boolean
    educationRoster?: boolean
    aiAssistant?: boolean
    speechToText?: boolean
  }

  aiPolicy: {
    allowedProviders: string[]
    allowedDataTiers: string[]
    externalProcessingAllowed: boolean
    retentionPolicyRef?: string
  }

  voicePolicy: {
    enabled: boolean
    rawAudioRetention: 'FORBIDDEN' | 'EPHEMERAL' | 'EXPLICIT_ONLY'
    transcriptPersistence: 'CONFIRMED_ONLY' | 'ALLOWED'
  }

  dataPolicy: {
    allowedDataTiers: string[]
    residency?: string
    exportAllowed: boolean
  }

  consent: {
    authority: 'PERSONAL' | 'INSTITUTION_ADMIN'
    grantedAt?: string
    revokedAt?: string
    scopeReceiptRef?: string
  }
}
```

## 6. Capability resolver

Ogni integrazione passa da:

`TeacherMoment → InstitutionPolicy → capability resolver → provider adapter`

L'interfaccia non deve chiedere al docente se usare Google o Microsoft ogni volta.

Esempio:

`Salva il materiale per la 2C`

può risolversi in:

- Google Drive;
- SharePoint;
- storage interno;

secondo policy e contesto.

Il docente deve vedere l'effetto prima di una write esterna significativa, non il dettaglio di ogni API.

## 7. Data minimization

Il configuratore deve applicare:

- minimum necessary data;
- minimum necessary scopes;
- purpose limitation;
- provider-specific retention;
- revocabilità;
- separazione Tier 1 / Tier 2;
- nessuna sincronizzazione roster se non necessaria;
- nessun accesso mailbox/site-wide senza requisito dimostrato.

## 8. Identity e multi-tenant

Il prodotto deve poter essere distribuito a istituti differenti senza hard-code del provider.

Target architetturale:

- tenant/institution binding esplicito;
- policy versionata;
- connector credentials fuori dal dominio;
- secrets in secret manager/provider appropriato;
- audit di consent;
- capability filtering server-side;
- nessuna fiducia in flag client.

## 9. Relazione con le Impostazioni docente

Le Impostazioni correnti definiscono il contesto professionale personale: istituto, cattedra, classi, discipline, libri, preset.

L'Institutional Configurator governa un livello superiore:

`istituto → policy digitale → provider/scopes/data boundary → capability disponibili`

Non crea una seconda Cattedra, un secondo Orario o un secondo catalogo classi.

## 10. Deployment models

### Pilot personale

- single owner;
- identity esistente;
- Supabase invariato;
- connector personali limitati.

### Pilot istituzionale

- institution binding;
- admin consent;
- policy versionata;
- utenti/gruppi autorizzati;
- data tiers espliciti.

### Multi-school

Non autorizzato come semplice estensione del pilot. Richiede isolamento tenant, security review, lifecycle amministrativo e support model separati.

## 11. Requisiti di audit

Ogni policy deve poter produrre una receipt con:

- institution/tenant;
- provider;
- scopes/capability autorizzate;
- data tier;
- AI provider policy;
- voice retention policy;
- data ultima modifica;
- soggetto autorizzante;
- stato attivo/revocato.

## 12. Principio finale

> **DOCENTE OS deve essere interoperabile senza diventare dipendente dall'ecosistema dell'istituto.**

Google Workspace e Microsoft 365 sono ambienti ospitanti e provider di capability. La continuità professionale del docente resta il centro del prodotto.