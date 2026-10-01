# CAP-DOS-ARGO-SYNC — G5-C XLS writer proof

Status: **SPIKE / NOT PRODUCTION AUTHORIZED**

## Candidate selected

**SheetJS Community Edition 0.20.3**

Selection basis, checked against official SheetJS documentation on 2026-10-01:

- SheetJS CE documents write support for **Excel 97-2004 XLS BIFF8** through `bookType: 'biff8'`;
- the general writer API supports Node.js buffers;
- SheetJS CE is licensed under **Apache-2.0**;
- official installation guidance identifies the SheetJS CDN tarball as the authoritative package source;
- the same guidance recommends vendoring for long-term stability.

Spike dependency:

```text
https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

This direct tarball dependency is acceptable **only for the G5-C proof branch**. Production adoption requires a separate reproducibility decision, preferably vendoring the exact approved tarball and recording its digest.

## Proof contract

The proof must establish automatically:

1. real OLE Compound File signature, not renamed OOXML;
2. BIFF8 writer selection;
3. exactly one worksheet named `Dati`;
4. exact six headers and order;
5. module row followed by argument rows;
6. exact status mapping;
7. date mapping to `DD-MM-YYYY`;
8. semantic round-trip through the same parser;
9. no formulas;
10. no hyperlinks;
11. no VBA payload;
12. profile validation runs before generation.

## Explicitly not proven by CI

The automated spike does **not** claim that didUP accepts the generated workbook.

Two human/external checks remain mandatory before G5-C can close:

1. open the generated reference file in LibreOffice without repair/conversion warnings;
2. import that same file manually in didUP and record the result.

No browser automation, credentials, API write, DB migration or UI integration is part of this spike.


## Reference artifact generated from CI

Generation evidence:

- source head: `5b8bb6306829ca2a494c70dc39ee7a90fb9387ad`
- artifact: `argo-program-g5c-reference.xls`
- size: `4096 bytes`
- SHA-256: `23f3564b959cbb99b7d9a249429da2f6d9d16f785311b1e744b5202e9cc6fcf9`
- OLE/CFB signature: `d0cf11e0a1b11ae1`
- automated Product CI result on generation head: PASS

The artifact bytes were produced by the G5-C writer executed in CI. The temporary Base64 log emission used only to extract this proof artifact was removed immediately afterwards and is not part of the intended implementation.
