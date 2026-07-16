# IT Tickets

Gestionale ticket IT interno aziendale, costruito con Next.js 16 (App Router) + TypeScript, Prisma 7 / PostgreSQL e autenticazione autonoma. Completamente self-hosted: nessun servizio cloud esterno richiesto.

## Funzionalità principali

- **Ticket** con stato, priorità, categoria, allegati e tag colorati
- **Cronologia ticket**: collegamento padre/figlio tra ticket correlati
- **Tre ruoli**: Administrator · IT · Utente richiedente
- **Commenti** pubblici e note interne (solo staff); menzioni `@nome` con notifica
- **Email HTML** con logo aziendale, colore brand e CTA button — via SMTP interno
- **SLA** configurabile per priorità, con badge ⚠/⏱ su dashboard e dettaglio; modalità **orari lavorativi** (esclude notti e weekend)
- **Report** con KPI, grafici donut, distribuzione e andamento giornaliero; legenda stati
- **Chiusura ticket con motivazione obbligatoria** — il motivo è registrato nella cronologia
- **Chiusura automatica** dei ticket Risolti dopo N giorni senza aggiornamenti (configurabile)
- **Azioni in blocco**: cambio stato e assegnazione massiva dalla dashboard
- **Template ticket** per pre-compilare titolo, descrizione, categoria e priorità
- **Risposte rapide** (canned responses) inseribili con un click nei commenti
- **Branding personalizzabile**: nome app, colore brand, logo, logo email, favicon
- **Auto-registrazione** con verifica codice via email; password temporanea per account creati dall'admin
- **Tema** chiaro / scuro / automatico con toggle in header
- **Export CSV** dei ticket filtrati
- **Stampa report** ottimizzata (nasconde nav, mostra solo i dati)
- **Digest giornaliero** e promemoria automatici per lo staff IT

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
