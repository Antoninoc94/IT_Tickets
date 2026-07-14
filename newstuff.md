# Idee e funzionalità future

## Comunicazione
- **Flag disabilita email** — campo `emailEnabled` in `Setting`, checkbox nelle impostazioni, controllo prima di ogni `sendMail`
- **Digest email giornaliera** — riepilogo ticket aperti inviato ogni mattina allo staff (cron job)

## Gestione ticket
- **Tag/etichette personalizzabili** — tabella `Tag` (nome, colore), relazione many-to-many con `Ticket`, filtro per tag in dashboard

## Dashboard e report
- **Grafici nella pagina Report** — ticket per stato, priorità, categoria (grafici a barre/torta)
- **Tempo medio di risoluzione per tecnico** — tabella nella pagina Report
- **Widget "I miei ticket assegnati"** — sezione nella dashboard per lo staff con i propri ticket in carico

## Produttività
- **Promemoria automatico** — se un ticket è aperto da X giorni senza risposta, invia email al tecnico assegnato (configurabile nelle impostazioni)
- **Menzione utenti nei commenti** — digitando `@nome` nel commento notifica l'utente via email
