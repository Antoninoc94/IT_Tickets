# IT Tickets — Guida al deploy

## Panoramica dell'applicazione

IT Tickets è un portale di ticketing interno basato su Next.js 16, Prisma 7 e PostgreSQL, containerizzato con Docker Compose. Permette agli utenti di aprire segnalazioni, al team IT di gestirle e agli amministratori di configurare ogni aspetto del sistema.

### Funzionalità principali

**Ticket**
- Creazione con titolo, descrizione, categoria, priorità e allegati
- Stati: Aperto → In lavorazione → In attesa dell'utente → Risolto → Chiuso
- Priorità: Urgente, Alta, Media, Bassa con indicatore SLA
- Assegnazione al team IT (cambio automatico di stato in "In lavorazione")
- Ticket figli/genitori (relazione gerarchica)
- Chiusura rapida da parte del richiedente o dello staff; riapertura dello staff
- Eliminazione (solo ADMIN e IT)
- Tracciamento lettura (badge "non letto" nella dashboard)

**Commenti e allegati**
- Commenti pubblici e interni (solo staff vede i commenti interni)
- Menzioni con `@nome` — evidenziate e notificate via email
- Allegati su ticket e commenti (dimensione massima configurabile, default 25 MB per file)
- Download allegati protetto da autenticazione

**Categorie e tag**
- Categorie dinamiche: create, rinominate, colorate, abilitate/disabilitate e riordinate dall'admin
- Etichette (tag) libere: create e assegnate ai ticket dallo staff
- Filtro per categoria e tag in dashboard e report

**Modelli e risposte rapide**
- Modelli ticket: titolo, descrizione, categoria e priorità precompilati
- Risposte rapide (canned responses): testi predefiniti inseribili nei commenti

**Utenti**
- Ruoli: `ADMIN`, `IT`, `USER`
- Registrazione autonoma con verifica email (dominio opzionale)
- Creazione account da parte dell'admin con password temporanea (l'utente deve cambiarla al primo accesso)
- Attivazione/disattivazione account
- Modifica nome ed email dallo staff

**Dashboard e report**
- Dashboard con filtri per stato, priorità, categoria, richiedente, assegnatario, etichetta, testo libero e intervallo date
- Pagina Report (solo staff): grafici donut, trend e barre di distribuzione
- Export CSV con tutti i filtri attivi
- Stampa report ottimizzata

**Email**
- Notifiche automatiche: nuovo ticket, assegnazione, cambio stato, nuovo commento, menzione
- Template soggetto e corpo personalizzabili per ogni tipo di notifica
- Variabili nei template: `{{ticketTitle}}`, `{{requesterName}}`, `{{status}}`, `{{commentBody}}`, `{{ticketUrl}}`, ecc.
- Promemoria automatico per ticket inattivi (dopo N giorni configurabili)
- Chiusura automatica dei ticket Risolti (dopo N giorni configurabili)
- Digest giornaliero per il team IT
- Due provider disponibili: SMTP classico e Microsoft Graph API (Office 365), selezionabili dall'UI senza redeploy

**Branding**
- Nome applicazione personalizzabile
- Colore brand (hex)
- Logo aziendale (PNG/JPG/WebP, sostituisce le iniziali in tutta l'app)
- Logo email in versione chiara (per header email su sfondo colorato)
- Favicon personalizzata (ICO/PNG/SVG)

**SLA**
- Soglie configurabili per priorità (ore dalla creazione)
- Modalità solo ore lavorative con finestra oraria e giorni della settimana configurabili

**Archiviazione**
- Spazio allegati visibile nell'UI
- Pulizia manuale degli allegati dei ticket chiusi da più di N giorni

---

## Prerequisiti sulla VM

- Docker Engine + plugin Docker Compose
- Container Nginx Proxy Manager (NPM) già attivo sulla stessa rete Docker/host
- Accesso di rete al server email (SMTP interno oppure Microsoft 365)

---

## Setup iniziale

```bash
git clone <repo> IT_Tickets
cd IT_Tickets
cp .env.example .env
```

Edita `.env` con i valori della tua installazione (vedi tabella sotto), poi avvia:

```bash
docker compose up -d
```

Il servizio `migrate` applica tutte le migration del database prima che `app` parta.

### Variabili d'ambiente

**Database**

| Variabile | Esempio | Note |
|---|---|---|
| `DATABASE_URL` | `postgresql://it_tickets:pass@postgres:5432/it_tickets?schema=public` | Generalmente non si tocca con Docker |
| `POSTGRES_USER` | `it_tickets` | |
| `POSTGRES_PASSWORD` | `sicura123` | Obbligatoria |
| `POSTGRES_DB` | `it_tickets` | |

**Applicazione**

| Variabile | Esempio | Note |
|---|---|---|
| `AUTH_SECRET` | `$(openssl rand -base64 32)` | Minimo 32 caratteri, obbligatorio |
| `APP_URL` | `https://ticket.azienda.local` | URL pubblico — usato nei link delle email |
| `ALLOWED_EMAIL_DOMAIN` | `azienda.it` | Lascia vuoto per non limitare la registrazione |
| `CRON_SECRET` | `$(openssl rand -base64 24)` | Token per autorizzare le chiamate cron |

**Allegati**

| Variabile | Esempio | Note |
|---|---|---|
| `MAX_UPLOAD_SIZE_MB` | `25` | Dimensione massima per singolo file |
| `UPLOADS_DIR` | `/app/uploads` | Lascia il default con Docker (volume montato) |

**Provider email**

Il provider attivo si sceglie da **Admin → Impostazioni → Email** nell'interfaccia (valore salvato nel database). Le credenziali rimangono nel `.env` e richiedono un riavvio del server se cambiate.

*SMTP (default)*

| Variabile | Esempio | Note |
|---|---|---|
| `SMTP_HOST` | `mail.azienda.local` | Server SMTP interno |
| `SMTP_PORT` | `25` | Default 25 |
| `SMTP_SECURE` | `false` | `true` per TLS su porta 465 |
| `SMTP_USER` | *(vuoto)* | Ometti se il relay non richiede autenticazione |
| `SMTP_PASS` | *(vuoto)* | |
| `SMTP_FROM` | `support@azienda.it` | Indirizzo mittente visualizzato |

*Microsoft Graph API — Office 365*

Registra un'app in Azure AD con il permesso applicativo `Mail.Send` (non delegato), genera un segreto client, poi imposta:

| Variabile | Note |
|---|---|
| `GRAPH_TENANT_ID` | ID del tenant Azure AD (GUID) |
| `GRAPH_CLIENT_ID` | ID applicazione (client) registrata in Azure |
| `GRAPH_CLIENT_SECRET` | Segreto client dell'app Azure |
| `GRAPH_SENDER_EMAIL` | Casella mittente (es. `support@azienda.onmicrosoft.com`) |

La pagina **Impostazioni → Email** mostra in tempo reale quali variabili sono configurate, così puoi verificare prima di attivare il provider Graph.

**Seed (primo avvio)**

| Variabile | Esempio | Note |
|---|---|---|
| `SEED_ADMIN_EMAIL` | `admin@azienda.it` | Usato solo dal seed |
| `SEED_ADMIN_PASSWORD` | `ChangeMe123!` | Usato solo dal seed |

### Primo account ADMIN

```bash
docker compose run --rm migrate npx prisma db seed
```

Il seed crea l'account admin con `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` e inserisce le categorie di default. In alternativa, registrarsi normalmente e promuovere l'account nel database:

```bash
docker compose exec postgres psql -U it_tickets it_tickets \
  -c "UPDATE \"User\" SET role='ADMIN' WHERE email='tua@email.it';"
```

---

## Servizi Docker Compose

| Servizio | Immagine | Ruolo |
|---|---|---|
| `postgres` | `postgres:16-alpine` | Database con volume persistente |
| `migrate` | Build locale (target `builder`) | Esegue `prisma migrate deploy` + seed, poi termina |
| `app` | Build locale (target `runner`) | App Next.js sulla porta `3000` |
| `cron` | `alpine:3` | Cron giornaliero: promemoria, auto-chiusura, digest |

### Volumi persistenti

| Volume | Percorso nel container | Contenuto |
|---|---|---|
| `postgres_data` | `/var/lib/postgresql/data` | Dati del database |
| `uploads_data` | `/app/uploads` | Allegati caricati dagli utenti |

---

## Aggiornamenti

### Script automatico (raccomandato)

```bash
./deploy.sh
```

Equivale a:

```bash
cd ~/IT_Tickets
git pull origin claude/it-ticket-management-app-qto7ln
docker compose down
docker compose build
docker compose up -d
```

Lo script usa `set -e` e si ferma al primo errore.

### Prima esecuzione

```bash
chmod +x ~/IT_Tickets/deploy.sh
```

---

## Collegamento a Nginx Proxy Manager

1. In NPM crea un nuovo **Proxy Host**
2. **Domain**: dominio interno (es. `ticket.azienda.local`)
3. **Forward Hostname/IP**: nome container `app` (se sulla stessa rete Docker) oppure IP della VM
4. **Forward Port**: `3000`
5. Abilita SSL con certificato Let's Encrypt o interno

> Se NPM gira in un container separato, assicurati che sia sulla stessa rete Docker di `app`, oppure esponi la porta `3000` sull'host e punta NPM all'IP della VM.

---

## Cron jobs

Il servizio `cron` esegue ogni giorno tre operazioni chiamando le route API dell'app:

| Endpoint | Funzione |
|---|---|
| `GET /api/cron/reminders` | Invia promemoria ai tecnici per ticket inattivi; chiude automaticamente i ticket Risolti scaduti |
| `GET /api/cron/digest` | Invia il digest mattutino al team IT (se abilitato) |

Le chiamate sono autenticate con l'header `x-cron-secret: <CRON_SECRET>`. Se `CRON_SECRET` non è impostato, i job vengono rifiutati con 401.

I parametri (giorni di inattività, giorni auto-chiusura, digest abilitato) si configurano da **Admin → Impostazioni → Email**.

---

## Ruoli utente

| Ruolo | Accesso |
|---|---|
| `USER` | Crea e segue i propri ticket; commenta; vede solo i propri allegati |
| `IT` | Vede tutti i ticket; assegna, cambia stato, aggiunge commenti interni; gestisce etichette e modelli |
| `ADMIN` | Tutto ciò che può fare IT + gestione utenti, categorie, impostazioni globali, risposte rapide |

---

## Gestione allegati e spazio disco

Gli allegati vengono salvati nel volume `uploads_data`. Il limite per file è configurabile con `MAX_UPLOAD_SIZE_MB` (default 25 MB).

In **Admin → Impostazioni → Archiviazione** trovi:
- Spazio totale occupato dagli allegati
- Pulsante per eliminare gli allegati dei ticket chiusi da più di N giorni

---

## Accesso diretto al database

```bash
docker compose exec postgres psql -U it_tickets it_tickets
```

---

## Configurazione post-deploy (checklist)

Dopo il primo avvio, accedi con l'account admin e configura:

1. **Admin → Impostazioni → Grafica** — nome app, colore brand, logo, favicon
2. **Admin → Impostazioni → SLA** — soglie per priorità, eventualmente ore lavorative
3. **Admin → Impostazioni → Email** — scegli provider (SMTP o Graph), abilita email, imposta promemoria e digest
4. **Admin → Impostazioni → Email Template** — verifica e personalizza i template di notifica
5. **Admin → Categorie** — aggiungi/modifica le categorie di default in base alla tua organizzazione
6. **Admin → Utenti** — crea gli account del team IT e assegna i ruoli
7. **Admin → Modelli** — configura eventuali modelli ticket ricorrenti
8. **Admin → Risposte rapide** — aggiungi le risposte predefinite per il team IT
