# X5-B — Professional UDA Export Contract

Status: ACTIVE TRANCHE

## Scope

X5-B introduces the first professional export for a versioned UDA authored in DOCENTE OS.

The first export format is **print-ready PDF through the browser's native print/save-PDF pipeline**. This deliberately avoids introducing a second rendering engine or a PDF library before the document model is stable.

## Invariants

1. Export is generated from an **immutable authored version**, never from unsaved local editor state.
2. The Knowledge source remains unchanged.
3. The exported document exposes:
   - title;
   - authored version number;
   - academic year when available;
   - source title/reference;
   - export timestamp only as metadata/supporting information, not as document authority.
4. Opening the export surface performs **no persistent write**.
5. Export does not authorize any new X4 assistant write capability.
6. A user can return to the exact authored document after export.

## Human task

`Documento di lavoro -> Esporta PDF -> anteprima stampabile -> Stampa / Salva PDF`

The export surface must be readable as a professional school document without application chrome. The primary action is explicit; printing is never triggered automatically on navigation.

## Gate X5-B

The acceptance gate must verify:

- export route is authenticated and workspace-scoped;
- selected version is rendered exactly;
- source provenance and version are visible;
- opening export causes no new authored version or other persistent side effect;
- print action is user-triggered;
- mobile and desktop print-preview surfaces have no horizontal overflow;
- X5-A versioning and conflict protection remain green.
