# DOCENTE OS — Mobile Rules

Stato: **CANONICAL**

Viewport di riferimento automatico iniziale: **412 × 915 CSS px**. Il prodotto deve restare utilizzabile anche sotto 390 px; i gate possono aggiungere viewport più stretti quando una superficie è critica.

## Regole strutturali

- Nessun overflow orizzontale della pagina ordinaria.
- Gli overflow interni sono ammessi solo quando il contenuto lo richiede davvero e la zona scrollabile è riconoscibile.
- Una tabella desktop molto larga viene trasformata in rappresentazione verticale quando la relazione colonna-valore non è più leggibile.
- Le azioni primarie occupano larghezza sufficiente e non richiedono precisione fine.
- Pannelli flottanti e assistenti non devono occupare la maggior parte dello schermo né nascondere il contesto necessario.
- La navigazione fissa inferiore non deve coprire contenuti o azioni finali: prevedere spazio per safe area e fondo pagina.

## Gerarchia

Sul primo viewport devono essere riconoscibili almeno:

1. identità/contesto;
2. titolo o compito corrente;
3. stato o prossimo passo, se presente.

Elementi secondari vengono spostati sotto o resi progressivamente esposti invece di essere compressi lateralmente.

## Target di interazione

Controlli principali e icon button: obiettivo minimo **40–44 px**. Controlli inferiori a 36 px vengono registrati dal sistema di accettazione come possibile `WATCH`, salvo casi motivati.

## Testo

- Niente riduzione indiscriminata del carattere per “far entrare tutto”.
- Titoli possono andare a capo.
- Metadati possono essere troncati solo quando l'informazione completa resta recuperabile.
- Testo operativo importante non deve dipendere dal tooltip.

## Evidenza visuale

Per ogni modifica sostanziale della UI mobile il gate deve produrre almeno uno screenshot reale della superficie interessata. Il PASS strutturale non sostituisce il giudizio visuale: una pagina può non avere overflow e restare comunque eccessivamente lunga, rumorosa o priva di gerarchia.