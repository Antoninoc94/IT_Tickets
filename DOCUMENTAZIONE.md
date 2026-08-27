# IT Ticketing — Documentazione tecnica e funzionale

> Portale di supporto IT interno — gestione ticket, notifiche email, SLA e reportistica.

---

## Indice

1. [Panoramica del progetto](#1-panoramica-del-progetto)
2. [Stack tecnologico](#2-stack-tecnologico)
3. [Ruoli e permessi](#3-ruoli-e-permessi)
4. [Funzionalità implementate](#4-funzionalità-implementate)
5. [Database — schema Prisma](#5-database--schema-prisma)
6. [Variabili d'ambiente](#6-variabili-dambiente)
7. [Deploy con Docker Compose](#7-deploy-con-docker-compose)
8. [Struttura del codice sorgente](#8-struttura-del-codice-sorgente)
9. [Email e notifiche](#9-email-e-notifiche)
10. [SLA — Service Level Agreement](#10-sla--service-level-agreement)
11. [Cron job automatici](#11-cron-job-automatici)
12. [Temi (chiaro / scuro / automatico)](#12-temi-chiaro--scuro--automatico)
13. [Roadmap — aggiornamenti futuri](#13-roadmap--aggiornamenti-futuri)

---

## 1. Panoramica del progetto

L'applicativo è un'applicazione web per la gestione interna dei ticket di assistenza IT. Permette agli utenti aziendali di aprire richieste di supporto, allo staff IT di gestirle e risolverle, e agli amministratori di configurare l'intero sistema.

L'applicazione è completamente **self-hosted**: gira in un container Docker e non dipende da servizi cloud esterni. Tutti i dati restano all'interno dell'infrastruttura aziendale.

---

## 2. Stack tecnologico

| Componente | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguaggio | TypeScript |
| ORM | Prisma 7 |
| Database | PostgreSQL 16 |
| Autenticazione | Cookie di sessione firmati (jose / JWT) |
| Email | Nodemailer (SMTP interno) oppure Microsoft Graph API (Office 365) |
| Stile | Tailwind CSS 4 |
| Container | Docker + Docker Compose |

---

## 3. Ruoli e permessi

Il sistema prevede tre ruoli distinti:

### `USER` — Utente richiedente
- Apre nuovi ticket
- Vede solo i propri ticket nella dashboard
- Aggiunge commenti pubblici sui propri ticket
- Può chiudere i propri ticket (solo se in stato **Aperto**), con motivazione obbligatoria
- Se il ticket è chiuso, può aprire un **ticket correlato** (figlio) con un click
- Allega file alle richieste e ai commenti

### `IT` — Staff tecnico
- Vede **tutti** i ticket nella dashboard
- Assegna ticket a sé stesso o ad altri colleghi IT
- Cambia stato, priorità e categoria tramite i pannelli di controllo
- Aggiunge commenti pubblici e **note interne** (non visibili all'utente)
- Aggiunge/rimuove etichette (tag) direttamente dalla pagina del ticket
- Accede alla sezione **Report** (link diretto in navigazione)
- Gestisce **Categorie**: crea, rinomina, colora, abilita/disabilita e definisce i campi personalizzati per categoria
- Gestisce **Etichette**, **Modelli ticket** e **Risposte rapide**
- Apre ticket **per conto di** un altro utente registrato (con ricerca per nome) o inserendo un nome libero
- Chiude ticket con motivazione obbligatoria; riapre ticket chiusi con motivazione
- Usa azioni in blocco dalla dashboard (cambio stato massivo, assegnazione massiva)

### `ADMIN` — Amministratore
- Tutti i permessi del ruolo IT
- Crea, modifica e disattiva account utente; imposta i ruoli
- Configura il branding (nome app, colore brand, logo, logo email, favicon)
- Configura i parametri SLA per priorità (ore per livello + modalità orari lavorativi)
- Configura i template email (oggetto e corpo)
- Configura promemoria automatici e digest giornaliero
- Configura la chiusura automatica dei ticket Risolti (giorni)
- Esegue la pulizia degli allegati dei ticket chiusi
- **Zona pericolosa**: elimina tutti i ticket, commenti, allegati ed eventi con conferma digitata ("ELIMINA")

---

## 4. Funzionalità implementate

### Autenticazione
- **Login** con email e password (hash Argon2)
- **Auto-registrazione**: l'utente compila il form, riceve un codice di verifica via email (6 cifre, valido 15 minuti) e lo conferma
- Possibilità di limitare la registrazione a uno specifico dominio email (`ALLOWED_EMAIL_DOMAIN`)
- **Password temporanea**: gli account creati dall'admin richiedono il cambio password al primo accesso (`mustChangePassword`)
- Sessione gestita con cookie HTTP-only firmati (`AUTH_SECRET`)
- **Invalidazione immediata sessione**: se un account viene disabilitato dall'admin, la sessione attiva viene invalidata al prossimo accesso — l'utente viene reindirizzato al logout pulito

### Dashboard e filtri
- Tabella ticket con paginazione numerata (10 ticket per pagina)
- Indicatore badge rosso in header per ticket con nuova attività non letta
- **Filtri**: stato, priorità, categoria, richiedente, assegnatario, testo libero, intervallo di date
- **Ordinamento** su qualsiasi colonna (Titolo, Richiedente, Priorità, Stato, Data)
- **Esportazione CSV** dei ticket filtrati (inclusi i campi personalizzati come colonne extra)
- Badge SLA (⚠ in ritardo / ⏱ in scadenza) direttamente sulla riga del ticket

### Azioni in blocco (bulk actions)
- Selezione multipla tramite checkbox
- Cambio stato massivo (In lavorazione / Risolto / Chiuso)
- Assegnazione massiva a un tecnico (o rimozione assegnazione)
- Barra azione flottante in basso quando almeno un ticket è selezionato

### Gestione ticket
- Apertura ticket con: titolo, descrizione, categoria, priorità, allegati
- **Campi personalizzati per categoria**: il form mostra dinamicamente i campi extra definiti dalla categoria selezionata (testo breve, testo lungo, numero, selezione a tendina); i valori vengono salvati con il ticket e inclusi nell'export CSV
- **Modelli (template)**: pre-compilazione del form da un template configurato
- Staff può aprire ticket **per conto di** un altro utente: selettore con ricerca per nome (combobox filtrabile) o inserimento nome libero
- **Cronologia eventi** (creazione, cambi stato, assegnazioni, chiusura, riapertura) in un riquadro collassabile in sidebar — le azioni di sistema mostrano "Sistema" come autore
- **Commenti pubblici e note interne** per lo staff, mostrati come bolle stile chat: i commenti dello staff (IT/Admin) sono allineati a destra e quelli del richiedente a sinistra — lo stesso per chiunque apra il ticket, indipendentemente da chi è loggato; colore per ruolo (bianco = richiedente, azzurro = IT/Admin, ambra = nota interna) e messaggi consecutivi dello stesso autore raggruppati senza ripetere avatar/nome
- **Aggiornamento in tempo reale**: la pagina del ticket controlla ogni 15 secondi se ci sono nuovi commenti/eventi da un'altra sessione e si aggiorna da sola (nessun refresh manuale)
- La sezione Commenti è **collassabile** (come la Cronologia): se è chiusa e arriva un commento da qualcun altro dopo l'ultima visita, compare un pallino di notifica accanto al conteggio, finché non la riapri
- **Menzioni** nei commenti (`@nome`) con notifica email all'utente menzionato
- **Allegati** su ticket e commenti (limite configurabile, default 25 MB): nel form si possono selezionare più file anche in più passaggi (si accumulano, con controllo duplicati) e rimuovere singolarmente prima dell'invio; anteprima inline ingrandita fino a ~1280px/80% dell'altezza schermo (immagini dirette, PDF/testo in iframe, altri file scaricabili)
- Tag colorati assegnabili e rimuovibili direttamente dalla pagina del ticket
- **Chiusura con motivazione obbligatoria**: cliccando "Chiudi ticket" si apre un form inline che richiede almeno 5 caratteri di motivazione; il motivo viene salvato come commento pubblico
- **Riapertura con motivazione obbligatoria**: stesso meccanismo per "Riapri ticket"
- La chiusura tramite menu a tendina Stato è disabilitata — si usa solo il bottone dedicato
- Utenti possono chiudere solo ticket in stato **Aperto** (non IN_PROGRESS, WAITING, RESOLVED)
- **Eliminazione** ticket: solo ADMIN e IT

### Ticket correlati (cronologia)
- Ogni ticket può avere un **ticket padre** (`parentTicketId`)
- Quando si apre un ticket correlato (da un ticket chiuso), il collegamento padre/figlio viene mantenuto
- La pagina di dettaglio mostra un **riquadro "Cronologia ticket"** con padre e figli collegati, con link e badge stato
- Gli utenti su un ticket chiuso vedono il bottone **"Apri ticket correlato"** per aprire una nuova richiesta collegata

### Categorie e campi personalizzati
- Categorie **dinamiche**: create, rinominate, colorate e abilitate/disabilitate dallo staff IT o dall'admin
- Ordine alfabetico automatico ovunque (dashboard, form, report)
- **Campi personalizzati per categoria** (gestiti da IT e Admin):
  - Tipi disponibili: `text` (riga singola), `textarea` (testo libero), `number` (numerico), `select` (menu a tendina con opzioni)
  - Ogni campo ha: nome, tipo, opzioni (per select), obbligatorietà
  - I campi vengono mostrati dinamicamente nel form di apertura ticket al cambio categoria
  - I valori sono salvati nel modello `TicketFieldValue` e inclusi nell'export CSV

### Etichette (tag)
- Creazione, modifica nome/colore, eliminazione dalla sezione Gestione
- Ricerca tag in tempo reale nel pannello di gestione
- Aggiunta/rimozione tag direttamente dalla pagina di dettaglio del ticket (solo staff)
- Tag visualizzati sulla dashboard e sul dettaglio come chip colorati

### Modelli ticket (template)
- IT e Admin possono creare template con titolo, descrizione, categoria e priorità pre-impostati
- Lo staff seleziona un template nel form di apertura ticket per pre-compilarlo
- Modificabili ed eliminabili da Gestione → Modelli

### Risposte rapide (canned responses)
- Testi predefiniti riutilizzabili per rispondere velocemente
- Gestione da Gestione → Risposte rapide (accessibile a IT e Admin)
- Inseribili nei commenti tramite dropdown con un click

### Report
- **KPI principali**: totale ticket, ticket ancora aperti, tempo medio di risoluzione (da creazione a Risolto/Chiuso), nuovi ticket ultimi 30 giorni con trend ▲/▼
- **Seconda riga KPI**: tempo medio prima risposta IT, ticket con almeno una risposta
- **Grafico andamento giornaliero** (linea, ultimi 60 giorni o periodo filtrato)
- **Grafici donut**: distribuzione per stato, per priorità, per categoria
- **Barre di distribuzione**: stessa ripartizione in formato lista con percentuali
- **Legenda stati** nella sezione "Distribuzione per stato"
- **Tabella per tecnico**: ticket risolti, tempo medio risoluzione, prima risposta media
- **Ticket per richiedente** e **carico di lavoro IT**
- **Filtri**: data da/a, categoria, priorità, assegnatario
- **Stampa** ottimizzata con header stampabile (nome app, data, filtri attivi)
- Accessibile direttamente dalla navigazione principale (link "Report" visibile allo staff)

### Branding e impostazioni di sistema (solo ADMIN)
- Nome applicazione (mostrato in header e nelle email)
- Colore brand principale (color picker — propagato via CSS custom property)
- Logo aziendale (PNG/SVG, max 5 MB) — sostituisce il badge con le iniziali
- **Logo email separato** (es. versione bianca per header email su sfondo colorato)
- Favicon personalizzata (mostrata nella tab del browser)
- Configurazione SLA per priorità (ore per URGENT / HIGH / MEDIUM / LOW)
- Abilitazione/disabilitazione invio email (master switch)
- Scelta del **provider email**: SMTP interno o Microsoft Graph API (Office 365) — selezionabile dall'UI senza redeploy
- Template email personalizzabili (oggetto + corpo con variabili `{{placeholder}}`)
- Promemoria automatico (giorni di inattività prima dell'email al tecnico)
- **Chiusura automatica ticket Risolti** (giorni prima della chiusura automatica; lascia vuoto per disabilitare)
- Digest giornaliero per lo staff IT (abilitazione on/off)
- Pulizia allegati dei ticket chiusi con riepilogo spazio occupato

### Zona pericolosa (solo ADMIN)
- **Azzera tutti i ticket**: elimina in modo permanente tutti i ticket, commenti, allegati ed eventi del sistema
- Richiede di digitare `ELIMINA` nel campo di conferma prima che il bottone si abiliti
- Utenti, categorie, impostazioni e template non vengono toccati
- Utile per reset di ambienti di test o avvio in produzione dopo un periodo di collaudo

### Tema visivo
- **Tre modalità**: Chiaro ☀️ / Scuro 🌙 / Automatico 💻 (segue le preferenze del sistema operativo)
- Toggle nel header in alto a destra
- La scelta viene salvata in `localStorage` e applicata prima del render (nessun flash al caricamento)
- Il tema manuale (Chiaro/Scuro) sovrascrive sempre la preferenza del sistema operativo
- Tutti i colori usano variabili CSS (`var(--background)`, `var(--surface)`, `var(--foreground)`, `var(--muted)`, `var(--border)`)

---

## 5. Database — schema Prisma

```
User
├── id, email, name, passwordHash, role (ADMIN|IT|USER)
├── active, mustChangePassword, emailVerifiedAt
├── totpSecret, totpEnabled          ← predisposto per 2FA TOTP (non attivo)
├── verificationCodeHash / ExpiresAt ← codice di verifica auto-registrazione
└── relazioni: ticketsCreated, ticketsAssigned, comments, attachments, ticketViews, ticketEvents

Category
├── id, name, color, enabled, position
└── relazioni: tickets, customFields

CustomField
├── id, name, type (text|textarea|number|select), options (JSON, per select), required
├── position (ordinamento)
└── categoryId → Category

Ticket
├── id, title, description
├── status (OPEN|IN_PROGRESS|WAITING_ON_USER|RESOLVED|CLOSED)
├── priority (LOW|MEDIUM|HIGH|URGENT)
├── categoryId → Category
├── requesterId → User, requesterLabel? (nome libero per non registrati)
├── assigneeId → User?
├── parentTicketId → Ticket? (self-referencing per ticket correlati)
├── createdAt, updatedAt, resolvedAt?, closedAt?
└── relazioni: comments, attachments, events, views, tags (many-to-many), parent, children, fieldValues

TicketFieldValue
├── id, value (stringa)
├── ticketId → Ticket
└── fieldId → CustomField

Comment
├── id, body, internal (nota interna se true)
├── ticketId → Ticket, authorId → User
└── attachments

Attachment
├── id, filename, mimeType, sizeBytes, storageKey (nome file su disco)
├── ticketId, commentId?, uploadedById
└── File salvati in /app/uploads (volume Docker persistente)

TicketEvent
├── id, type (CREATED|STATUS_CHANGED|ASSIGNED|UNASSIGNED|CLOSED|REOPENED|PRIORITY_CHANGED|CATEGORY_CHANGED)
├── meta (JSON — { from, to } per cambio stato; { assigneeName } per assegnazione;
│         { auto, days, from } per chiusura automatica)
├── ticketId, actorId → User?  ← null quando l'azione è eseguita dal sistema
└── createdAt

Tag              ← Etichette colorate (many-to-many con Ticket)
TicketTemplate   ← Modelli di ticket pre-compilati
CannedResponse   ← Risposte rapide per lo staff
TicketView       ← Traccia l'ultima visualizzazione per utente/ticket (badge "non letto")

Setting          ← Riga singleton (id="app") con tutte le impostazioni:
├── appName, brandColor
├── logoStorageKey?, emailLogoStorageKey?, faviconStorageKey?
├── slaUrgentHours?, slaHighHours?, slaMediumHours?, slaLowHours?
├── slaWorkingHoursOnly, slaWorkStart, slaWorkEnd, slaWorkDays
├── emailProvider (smtp|graph), emailEnabled
├── newTicketEmail*, assignedEmail*, statusChangedEmail*,
│   newCommentEmail*, mentionEmail* (subject + body template per ciascuno)
├── digestEnabled
├── reminderDays?   ← giorni inattività prima del promemoria
└── autoCloseDays?  ← giorni dopo cui un ticket RESOLVED viene chiuso automaticamente
```

---

## 6. Variabili d'ambiente

Configurate nel file `.env` nella root del progetto:

### Database e app

| Variabile | Obbligatoria | Default | Descrizione |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Stringa connessione PostgreSQL |
| `AUTH_SECRET` | ✅ | — | Chiave per firmare i cookie di sessione (min. 32 caratteri) |
| `APP_URL` | ✅ | `http://localhost:3000` | URL pubblico dell'app (usato nei link email) |
| `ALLOWED_EMAIL_DOMAIN` | — | — | Se impostato, solo email di questo dominio possono registrarsi |
| `MAX_UPLOAD_SIZE_MB` | — | `25` | Dimensione massima allegati in MB |
| `UPLOADS_DIR` | — | `/app/uploads` | Percorso directory allegati (nel container) |
| `POSTGRES_USER` | — | `it_tickets` | Utente PostgreSQL (usato nel Compose) |
| `POSTGRES_PASSWORD` | ✅ | — | Password PostgreSQL |
| `POSTGRES_DB` | — | `it_tickets` | Nome database |
| `CRON_SECRET` | — | — | Token per autenticare le chiamate cron (`x-cron-secret` header) |

### Provider email — SMTP (default)

| Variabile | Obbligatoria | Default | Descrizione |
|---|---|---|---|
| `SMTP_HOST` | — | — | Hostname del server SMTP interno |
| `SMTP_PORT` | — | `25` | Porta SMTP |
| `SMTP_SECURE` | — | `false` | `true` per TLS/SSL su porta 465 |
| `SMTP_USER` | — | — | Username SMTP (opzionale se no-auth) |
| `SMTP_PASS` | — | — | Password SMTP |
| `SMTP_FROM` | — | — | Indirizzo mittente email (es. `support@azienda.it`) |

### Provider email — Microsoft Graph API (Office 365)

Registrare un'app in Azure AD con il permesso applicativo `Mail.Send` (non delegato) e generare un segreto client.

| Variabile | Descrizione |
|---|---|
| `GRAPH_TENANT_ID` | ID del tenant Azure AD (GUID) |
| `GRAPH_CLIENT_ID` | ID applicazione (client) registrata in Azure |
| `GRAPH_CLIENT_SECRET` | Segreto client dell'app Azure |
| `GRAPH_SENDER_EMAIL` | Casella mittente (es. `support@azienda.onmicrosoft.com`) |

Il provider attivo si seleziona dall'interfaccia **Admin → Impostazioni → Email** senza bisogno di redeploy. Le variabili rimangono nel `.env` e richiedono un riavvio del server se modificate.

### Seed (primo avvio)

| Variabile | Esempio | Note |
|---|---|---|
| `SEED_ADMIN_EMAIL` | `admin@azienda.it` | Usato solo dal seed |
| `SEED_ADMIN_PASSWORD` | `ChangeMe123!` | Usato solo dal seed |

**Esempio `.env`:**
```env
DATABASE_URL=postgresql://it_tickets:CAMBIA_QUESTA_PASSWORD@postgres:5432/it_tickets
AUTH_SECRET=una-stringa-casuale-di-almeno-32-caratteri
APP_URL=https://support.azienda.it
POSTGRES_PASSWORD=CAMBIA_QUESTA_PASSWORD
CRON_SECRET=un-altro-token-segreto
ALLOWED_EMAIL_DOMAIN=azienda.it
SMTP_HOST=mail.azienda.it
SMTP_PORT=25
SMTP_FROM=support@azienda.it
SEED_ADMIN_EMAIL=admin@azienda.it
SEED_ADMIN_PASSWORD=ChangeMe123!
```

---

## 7. Deploy con Docker Compose

### Primo avvio

```bash
git clone <url-repo> IT_Tickets && cd IT_Tickets
cp .env.example .env   # compila le variabili obbligatorie
docker compose up -d
docker compose run --rm migrate npx prisma db seed   # crea il primo account ADMIN
```

Al primo avvio il servizio `migrate` esegue automaticamente tutte le migration Prisma. Dopo il completamento, il servizio `app` si avvia sulla porta `3000`.

### Aggiornamenti

Lo script `deploy.sh` (nella root del progetto) automatizza l'intero processo:

```bash
./deploy.sh
```

Equivale a:

```bash
git pull origin <branch>
docker compose down
docker compose build
docker compose up -d
```

Lo script usa `set -e` e si ferma al primo errore. Le migration vengono riapplicate automaticamente dal servizio `migrate` ad ogni avvio.

### Prima esecuzione dello script

```bash
chmod +x ~/IT_Tickets/deploy.sh
```

### Servizi nel Compose

| Servizio | Immagine | Ruolo |
|---|---|---|
| `postgres` | `postgres:16-alpine` | Database PostgreSQL con volume persistente |
| `migrate` | Build locale (target `builder`) | Esegue `prisma migrate deploy` all'avvio, poi termina |
| `app` | Build locale (target `runner`) | Applicazione Next.js sulla porta 3000 |
| `cron` | `alpine:3` | Esegue i cron job giornalieri (promemoria + auto-chiusura + digest) |

### Volumi persistenti

- `postgres_data` — dati del database
- `uploads_data` — allegati caricati dagli utenti (montato in `/app/uploads`)

Vedi [`docs/deploy.md`](./docs/deploy.md) per la guida completa al deploy su VM ESXi con Nginx Proxy Manager.

---

## 8. Struttura del codice sorgente

```
src/
├── app/
│   ├── (app)/                  ← Tutte le pagine autenticate (layout con header)
│   │   ├── layout.tsx          ← Header con navigazione, theme toggle, badge non letti
│   │   ├── nav-dropdown.tsx    ← Dropdown navigazione (client)
│   │   ├── mobile-nav.tsx      ← Navigazione mobile (drawer)
│   │   ├── unread-badge.tsx    ← Badge contatore non letti (rifetch a ogni cambio pagina)
│   │   ├── dashboard/
│   │   │   ├── page.tsx        ← Server: fetch ticket, SLA, paginazione, filtri
│   │   │   ├── ticket-table.tsx← Client: tabella interattiva + bulk actions
│   │   │   └── filter-bar.tsx  ← Filtri avanzati (form GET)
│   │   ├── tickets/
│   │   │   ├── attachment-input.tsx ← Input file condiviso (new/ e [id]/): selezione cumulativa, chip rimovibili
│   │   │   ├── new/            ← Form apertura ticket (template, requester, campi custom)
│   │   │   └── [id]/           ← Dettaglio: commenti, allegati, controlli, cronologia
│   │   │       ├── ticket-controls.tsx    ← Dropdown stato/priorità/categoria/assegnatario
│   │   │       ├── close-ticket-button.tsx← Form inline con motivazione obbligatoria
│   │   │       ├── reopen-ticket-button.tsx← Form inline con motivazione obbligatoria
│   │   │       ├── delete-ticket-button.tsx
│   │   │       ├── ticket-history.tsx     ← Cronologia eventi, collassabile (autore "Sistema" per cron)
│   │   │       ├── tag-editor.tsx         ← Aggiunta/rimozione tag
│   │   │       ├── similar-tickets.tsx    ← Suggerimenti ticket simili per titolo (staff)
│   │   │       ├── live-refresh.tsx       ← Poll ogni 15s, router.refresh() se il ticket è cambiato
│   │   │       ├── comments-panel.tsx     ← Sezione commenti collassabile + badge non letto
│   │   │       ├── comments-scroll-area.tsx← Box scorrevole con auto-scroll allo scrivere/arrivo commento
│   │   │       ├── comment-item.tsx       ← Singola bolla commento (allineamento per ruolo, raggruppamento)
│   │   │       ├── comment-form.tsx       ← Form nuovo commento + risposte rapide + menzioni
│   │   │       ├── attachment-list.tsx    ← Lista allegati con anteprima modale
│   │   │       └── view-tracker.tsx       ← Traccia ultima visualizzazione
│   │   ├── reports/            ← Report con KPI, grafici, filtri e stampa
│   │   └── admin/
│   │       ├── users/          ← Gestione utenti (ADMIN)
│   │       ├── tags/           ← Gestione etichette (IT+ADMIN)
│   │       ├── templates/      ← Modelli ticket (IT+ADMIN)
│   │       ├── categories/     ← Gestione categorie + campi personalizzati (IT+ADMIN)
│   │       │   ├── page.tsx
│   │       │   ├── categories-client.tsx
│   │       │   └── custom-fields-editor.tsx
│   │       ├── canned-responses/ ← Risposte rapide (IT+ADMIN)
│   │       └── settings/       ← Impostazioni sistema + zona pericolosa (ADMIN)
│   │           ├── page.tsx
│   │           └── wipe-form.tsx  ← Form conferma eliminazione tutti i ticket
│   ├── account/                ← Profilo e cambio password utente corrente
│   ├── actions/                ← Server Actions (mutazioni dati)
│   │   ├── tickets.ts          ← CRUD ticket, bulk, close/reopen con motivazione
│   │   ├── auth.ts             ← Login, logout
│   │   ├── register.ts         ← Auto-registrazione + verifica email
│   │   ├── users.ts            ← Gestione utenti (admin)
│   │   ├── tags.ts             ← CRUD tag
│   │   ├── templates.ts        ← CRUD modelli ticket
│   │   ├── categories.ts       ← CRUD categorie (IT+ADMIN)
│   │   ├── custom-fields.ts    ← CRUD campi personalizzati per categoria (IT+ADMIN)
│   │   ├── canned-responses.ts ← CRUD risposte rapide (IT+ADMIN)
│   │   ├── settings.ts         ← Salvataggio impostazioni (incluso autoCloseDays)
│   │   ├── attachments.ts      ← Upload, cancellazione allegati + wipeAllTickets
│   │   └── account.ts          ← Modifica profilo, cambio password
│   ├── api/
│   │   ├── auth/signout/       ← Route Handler logout: cancella cookie e reindirizza
│   │   ├── attachments/[id]/   ← Download sicuro allegati (auth check)
│   │   ├── branding/           ← Serving logo, email-logo, favicon
│   │   ├── cron/
│   │   │   ├── reminders/      ← Promemoria inattività + chiusura automatica RESOLVED
│   │   │   └── digest/         ← Digest giornaliero staff IT
│   │   ├── tickets/export/     ← Export CSV ticket filtrati (inclusi campi personalizzati)
│   │   └── unread-count/       ← Contatore badge non letti (polling)
│   ├── login/                  ← Pagina di accesso
│   ├── register/               ← Auto-registrazione + verifica codice
│   ├── change-password/        ← Cambio password obbligatorio primo accesso
│   ├── layout.tsx              ← Root layout (font, brand color CSS var, theme init)
│   ├── brand.tsx               ← Componenti logo/badge aziendale
│   ├── theme-toggle.tsx        ← Toggle tema chiaro/scuro/automatico
│   ├── local-time.tsx          ← Data/ora nel fuso locale del browser
│   └── globals.css             ← Design tokens CSS, dark mode, classi componenti
├── lib/
│   ├── dal.ts                  ← Data Access Layer (getCurrentUser, guard auth)
│   ├── prisma.ts               ← Istanza singleton Prisma Client
│   ├── mail.ts                 ← Invio email: seleziona provider SMTP o Graph
│   ├── mail-graph.ts           ← Invio via Microsoft Graph API
│   ├── email-html.ts           ← Builder email HTML (branded: logo, colore, CTA button)
│   ├── settings.ts             ← Lettura/cache impostazioni + renderTemplate
│   ├── sla.ts                  ← Calcolo SLA (ok / warning / overdue), orari lavorativi
│   ├── session.ts              ← Gestione cookie sessione (jose JWT)
│   ├── attachments.ts          ← Salvataggio/cancellazione file su disco
│   ├── ticket-labels.ts        ← Label, classi CSS e colori per stato/priorità/categoria
│   ├── render-mentions.tsx     ← Parser @menzioni nei commenti
│   ├── verification-code.ts    ← Generazione e hash codice verifica email
│   ├── format-bytes.ts         ← Formattazione dimensione file
│   └── query-params.ts         ← Utility gestione URL search params
└── generated/prisma/           ← Client Prisma generato automaticamente
```

---

## 9. Email e notifiche

Le email possono essere inviate tramite due provider selezionabili dall'interfaccia senza redeploy:

- **SMTP** — server SMTP interno aziendale; configurato tramite variabili `SMTP_*`
- **Microsoft Graph API** — Office 365; configurato tramite variabili `GRAPH_*` (registrazione app Azure AD con permesso `Mail.Send`)

Tutte le email hanno un **layout HTML branded**: header colorato con logo aziendale (o logo email dedicato), corpo in testo formattato, pulsante CTA con link al ticket.

### Trigger di notifica

| Evento | Destinatario |
|---|---|
| Nuovo ticket aperto | Tutto lo staff IT attivo |
| Ticket assegnato | Tecnico assegnatario |
| Cambio di stato (incluso Risolto/Chiuso) | Richiedente |
| Ticket riaperto dallo staff | Richiedente |
| Ticket riaperto dall'utente | Tutto lo staff IT attivo |
| Nuovo commento pubblico | Richiedente (se autore ≠ richiedente) |
| Menzione `@nome` nel commento | Utente menzionato |
| Promemoria ticket inattivo | Tecnico assegnatario |
| Chiusura automatica (cron) | Richiedente |
| Digest giornaliero | Tutto lo staff IT attivo |

### Template email

Ogni template è personalizzabile dall'admin con variabili `{{placeholder}}`:

| Variabile | Disponibile in |
|---|---|
| `{{ticketTitle}}` | Tutti i template |
| `{{ticketUrl}}` | Tutti i template |
| `{{requesterName}}` | Nuovo ticket |
| `{{ticketDescription}}` | Nuovo ticket |
| `{{authorName}}` | Commento, menzione |
| `{{commentBody}}` | Commento, menzione |
| `{{status}}` | Cambio stato |

### Master switch

Le email possono essere disabilitate completamente dalla sezione Impostazioni. Utile in ambienti di test o staging.

---

## 10. SLA — Service Level Agreement

Lo SLA definisce il tempo massimo entro cui un ticket deve essere risolto in base alla priorità.

### Configurazione

Da Admin → Impostazioni si impostano le ore per ogni livello:
- URGENT: es. 4 ore
- HIGH: es. 8 ore
- MEDIUM: es. 24 ore
- LOW: es. 72 ore

Se un valore è lasciato vuoto, quella priorità non ha SLA.

### Calcolo e visualizzazione

Lo SLA è calcolato dalla data di creazione del ticket:

- **Nessun badge** (ok): tempo rimanente > 20% del totale
- **Arancione** ⏱ (warning): tempo rimanente ≤ 20% ma non ancora scaduto
- **Rosso** ⚠ (overdue): tempo scaduto

Lo stato SLA appare sulla dashboard accanto allo stato del ticket e nella pagina di dettaglio. I ticket Chiusi e Risolti non mostrano lo SLA.

### Orari lavorativi

Attivando **"Conta solo ore lavorative"** in Impostazioni → SLA, il conteggio esclude notti e giorni non lavorativi:

- **Orario**: fascia oraria lavorativa (inizio e fine, in UTC)
- **Giorni**: giorni della settimana lavorativi (default: Lunedì–Venerdì)

Esempio: SLA di 8 ore lavorative su una fascia 09:00–18:00 UTC. Un ticket aperto venerdì alle 17:00 UTC ha consumato 1 ora lavorativa; il rimanente 7 ore di conteggio riprende lunedì alle 09:00 UTC.

> **Nota fuso orario**: gli orari sono in UTC. Per un'azienda italiana in CET (UTC+1) che lavora 9:00–18:00 locali, configurare inizio = 8, fine = 17. In CEST (estate, UTC+2): inizio = 7, fine = 16.

---

## 11. Cron job automatici

Il container `cron` (Alpine Linux) esegue due chiamate HTTP ogni giorno alle **07:00**. Entrambe le API sono protette dall'header `x-cron-secret`.

### `/api/cron/reminders`

Esegue due operazioni in sequenza:

**1. Promemoria inattività**: invia un'email al tecnico assegnatario per ogni ticket:
- Non in stato Chiuso o Risolto
- Con un assegnatario
- Senza commenti negli ultimi N giorni (configurabile in Impostazioni → "Promemoria automatico")

**2. Chiusura automatica Risolti**: chiude automaticamente i ticket in stato **Risolto** dove:
- `resolvedAt` è più vecchio di N giorni (configurabile in Impostazioni → "Chiusura automatica ticket Risolti")
- Non ci sono commenti nelle ultime N giorni

Per ogni ticket auto-chiuso: aggiorna lo stato a CLOSED, crea un `TicketEvent` con `actorId = null` (mostrato come "Sistema" nella cronologia), e invia l'email di cambio stato al richiedente.

Nella cronologia del ticket l'evento appare come: *"Ticket chiuso automaticamente dopo N giorni senza aggiornamenti"*.

### `/api/cron/digest`

Invia allo staff IT un riepilogo mattutino dei ticket aperti (se il digest è abilitato in Impostazioni).

---

## 12. Temi (chiaro / scuro / automatico)

Il tema è gestito tramite l'attributo `data-theme` sull'elemento `<html>`:

- `data-theme="light"` → tema chiaro
- `data-theme="dark"` → tema scuro

### Inizializzazione senza flash

Un piccolo script inline viene eseguito nel `<head>` **prima del render** del browser:
1. Legge `localStorage.getItem('theme')`
2. Se il valore è `"dark"` o `"light"`, lo applica direttamente
3. Altrimenti, usa `prefers-color-scheme` del sistema operativo

### Toggle manuale

Il pulsante nel header cicla tra: `Automatico 💻 → Scuro 🌙 → Chiaro ☀️ → Automatico`.
La scelta viene salvata in `localStorage` e applicata immediatamente senza ricaricare la pagina.

Il tema manuale **sovrascrive sempre** la preferenza del sistema operativo. Questo è garantito da:

```css
/* globals.css */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

Questa direttiva Tailwind CSS v4 aggancia la variante `dark:` all'attributo `data-theme="dark"` sull'elemento `<html>` invece del media query `prefers-color-scheme`. In questo modo un utente che ha selezionato "Chiaro" ma ha il sistema in dark mode vede correttamente il tema chiaro.

### Variabili CSS

```css
:root {
  --background: #f4f5f7;
  --foreground: #111827;
  --surface:    #ffffff;
  --border:     #e5e7eb;
  --muted:      #6b7280;
  --brand:      /* dal database — colore brand aziendale */
}

[data-theme="dark"] {
  --background: #0f1117;
  --foreground: #f1f5f9;
  --surface:    #1e2130;
  --border:     #2d3148;
  --muted:      #8b9ab2;
}
```

---

## 13. Roadmap — aggiornamenti futuri

Funzionalità non ancora implementate, ordinate per priorità.

### Alta priorità

#### 🔐 Autenticazione a due fattori (2FA TOTP)
Lo schema database include già i campi `totpSecret` e `totpEnabled` sul modello `User`. Manca l'implementazione:
- Schermata di configurazione 2FA con QR code (app Authenticator)
- Verifica OTP al login
- **Libreria suggerita**: `otpauth` o `speakeasy`

#### 🔔 Notifiche in-app
Attualmente le notifiche arrivano solo via email. Un sistema in-app richiederebbe:
- Modello `Notification` nel database
- Lista notifiche con badge nel header
- Eventuale integrazione Server-Sent Events per aggiornamento live

### Media priorità

#### 🔍 Ricerca full-text avanzata
La ricerca attuale usa `contains` su titolo e descrizione. Migliorabile con:
- Indice full-text PostgreSQL (`to_tsvector`)
- Ricerca anche nel corpo dei commenti
- Risultati ordinati per rilevanza

#### 📋 Vista Kanban
Alternativa alla tabella della dashboard: board a colonne per stato con drag & drop dei ticket.

### Bassa priorità

#### 🌐 Internazionalizzazione (i18n)
L'interfaccia è solo in italiano. Per supportare più lingue: adottare `next-intl` ed estrarre le stringhe in file di traduzione.

#### 📱 Progressive Web App (PWA)
Aggiungere `manifest.json` e Service Worker per installazione su dispositivi mobili e notifiche push native.

---

## Note di sviluppo

### Aggiungere una migration Prisma

```bash
# Modifica prisma/schema.prisma, poi:
npx prisma migrate dev --name nome_migration

# In produzione (Docker), la migration viene applicata automaticamente
# all'avvio tramite il servizio `migrate` nel docker-compose.yml
```

### Rigenerare il client Prisma

```bash
npx prisma generate
```

### Avvio in sviluppo locale

```bash
npm install
docker compose up postgres -d      # oppure PostgreSQL locale
npx prisma migrate deploy
npm run dev
```

### Accesso al database in produzione

```bash
docker compose exec postgres psql -U it_tickets it_tickets
```

---

*Documentazione aggiornata il 27 luglio 2026 — versione corrente del progetto.*
