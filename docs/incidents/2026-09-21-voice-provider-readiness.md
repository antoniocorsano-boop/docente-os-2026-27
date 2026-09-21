# Incidente Beta — controllo voce esposto senza provider STT

Data: 2026-09-21

## Evidenza

Nel collaudo mobile la superficie **Registra la lezione** mostrava il controllo **Detta la lezione**, ma la trascrizione restituiva “La dettatura non è disponibile in questo momento”.

## Causa

La UI verificava soltanto `DOCENTE_OS_VOICE_CAPTURE`. L'adapter STT richiede anche una credenziale server-side `GROQ_STT_API_KEY`.

## Decisione

La disponibilità UI della dettatura richiede entrambe le condizioni:
- feature flag voce attivo;
- provider STT realmente configurato.

L'endpoint mantiene comunque il proprio fail-closed.

## Design classification

`COMPATIBLE` — stessa superficie e stesso modello di interazione; viene soltanto impedita l'esposizione di un controllo non eseguibile.

## Confini

Nessun secret viene salvato nel repository. Nessun cambio di provider, retention, privacy policy, Arena, P9 o DOS-A1.
