# Funzionalità implementate

Questo file era originariamente una roadmap di idee. Tutti gli elementi sotto sono stati implementati e sono documentati in `DOCUMENTAZIONE.md`.

## Comunicazione
- ✅ **Flag disabilita email** — campo `emailEnabled` in `Setting`, master switch nelle impostazioni
- ✅ **Digest email giornaliera** — cron job mattutino che invia il riepilogo ticket aperti allo staff IT
- ✅ **Microsoft Graph API (Office 365)** — secondo provider email selezionabile dall'UI senza redeploy

## Gestione ticket
- ✅ **Tag/etichette personalizzabili** — tabella `Tag` (nome, colore), relazione many-to-many con `Ticket`, filtro per tag in dashboard
- ✅ **Creazione ticket per conto di** — campo richiedente con combobox filtrabile per nome (staff) o nome libero
- ✅ **Filtro per etichetta in dashboard** — dropdown tag nel FilterBar
- ✅ **Campi personalizzati per categoria** — tipi text, textarea, number, select; inclusi nell'export CSV

## Dashboard e report
- ✅ **Grafici nella pagina Report** — donut per stato/priorità/categoria, trend giornaliero, barre distribuzione
- ✅ **Tempo medio di risoluzione per tecnico** — tabella nella pagina Report
- ✅ **Categorie dinamiche** — gestione completa da IT e Admin (create, rinominate, colorate, abilitate/disabilitate)

## Produttività
- ✅ **Promemoria automatico** — cron job che invia email al tecnico per ticket inattivi da N giorni
- ✅ **Menzione utenti nei commenti** — `@nome` notifica l'utente menzionato via email
- ✅ **Risposte rapide (canned responses)** — gestibili da IT e Admin, inseribili nei commenti con un click
- ✅ **Modelli ticket** — pre-compilazione form con titolo, descrizione, categoria e priorità
- ✅ **SLA con orari lavorativi** — finestra oraria e giorni della settimana configurabili
- ✅ **Zona pericolosa** — reset completo ticket e allegati (solo Admin, con conferma digitata)
