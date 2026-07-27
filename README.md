# IT Tickets

Gestionale ticket IT interno aziendale, costruito con Next.js 16 (App Router) + TypeScript, Prisma 7 / PostgreSQL e autenticazione autonoma. Completamente self-hosted: nessun servizio cloud esterno richiesto.

## Funzionalità principali

- **Ticket** con stato, priorità, categoria, allegati e tag colorati
- **Campi personalizzati per categoria** — l'amministratore definisce campi extra (testo, numero, selezione…) che appaiono dinamicamente nel form e vengono salvati con il ticket
- **Cronologia ticket**: collegamento padre/figlio tra ticket correlati
- **Tre ruoli**: Administrator · IT · Utente richiedente
- **Commenti** pubblici e note interne (solo staff); menzioni `@nome` con notifica
- **Email HTML** con logo aziendale, colore brand e CTA button — via SMTP interno o Microsoft Graph API (Office 365)
- **SLA** configurabile per priorità, con badge ⚠/⏱ su dashboard e dettaglio; modalità **orari lavorativi** (esclude notti e weekend)
- **Report** con KPI, grafici donut, distribuzione e andamento giornaliero
- **Azioni in blocco**: cambio stato e assegnazione massiva dalla dashboard
- **Template ticket** per pre-compilare titolo, descrizione, categoria e priorità
- **Risposte rapide** (canned responses) inseribili con un click nei commenti
- **Branding personalizzabile**: nome app, colore brand, logo, logo email, favicon
- **Auto-registrazione** con verifica codice via email; password temporanea per account creati dall'admin
- **Chiusura automatica** dei ticket Risolti dopo N giorni senza aggiornamenti
- **Digest giornaliero** e promemoria automatici per lo staff IT
- **Export CSV** dei ticket filtrati (inclusi i campi personalizzati)
- **Tema** chiaro / scuro / automatico con toggle in header
- **Stampa report** ottimizzata
- **Zona pericolosa**: reset completo di tutti i ticket e allegati (solo Admin)

## Ruoli

| Ruolo | Può fare |
|---|---|
| `USER` | Aprire e seguire i propri ticket, commentare |
| `IT` | Gestire tutti i ticket + categorie, campi personalizzati, etichette, modelli, risposte rapide |
| `ADMIN` | Tutto ciò che può fare IT + gestione utenti e impostazioni di sistema |

## Setup locale

```bash
cp .env.example .env   # configura DATABASE_URL, SMTP_*, AUTH_SECRET, APP_URL
npm install
npx prisma migrate dev
npx prisma db seed     # crea il primo account ADMIN
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Deploy (Docker Compose)

### Primo avvio

```bash
git clone <repo> IT_Tickets && cd IT_Tickets
cp .env.example .env   # compila le variabili obbligatorie
docker compose up -d
docker compose run --rm migrate npx prisma db seed   # crea l'admin iniziale
```

### Aggiornamenti successivi

```bash
./deploy.sh
```

Lo script `deploy.sh` esegue in sequenza: `git pull → docker compose down → build → up -d`.

Vedi [`docs/deploy.md`](./docs/deploy.md) per la guida completa al deploy su VM ESXi con Nginx Proxy Manager.
