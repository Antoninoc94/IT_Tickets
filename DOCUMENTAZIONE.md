# SANCO Support — Documentazione tecnica e funzionale

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

**SANCO Support** è un'applicazione web per la gestione interna dei ticket di assistenza IT. Permette agli utenti aziendali di aprire richieste di supporto, allo staff IT di gestirle e risolverle, e agli amministratori di configurare l'intero sistema.

L'applicazione è completamente **self-hosted**: gira in un container Docker e non dipende da servizi cloud esterni. Tutti i dati restano all'interno dell'infrastruttura aziendale.

---

## 2. Stack tecnologico

| Componente | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguaggio | TypeScript |
| ORM | Prisma 7 |
| Database | PostgreSQL 16 |
| Autenticazione | Session cookie (iron-session) |
| Email | Nodemailer (SMTP interno) |
| Stile | Tailwind CSS 4 |
| Container | Docker + Docker Compose |

---

## 3. Ruoli e permessi

Il sistema prevede tre ruoli distinti:

### `USER` — Utente richiedente
- Apre nuovi ticket
- Vede solo i propri ticket nella dashboard
- Aggiunge commenti pubblici sui propri ticket
- Può chiudere o riaprire i propri ticket
- Allega file alle richieste

### `IT` — Staff tecnico
- Vede **tutti** i ticket nella dashboard
- Assegna ticket a sé stesso o ad altri colleghi IT
- Cambia stato, priorità e categoria
- Aggiunge commenti pubblici e **note interne** (non visibili all'utente)
- Aggiunge/rimuove etichette (tag)
- Accede alla sezione Report e Gestione (Etichette, Modelli)
- Apre ticket **per conto di** un altro utente

### `ADMIN` — Amministratore
- Tutti i permessi del ruolo IT
- Crea, modifica e disattiva account utente
- Imposta il ruolo di ogni utente
- Configura le impostazioni di sistema (colore brand, logo, favicon)
- Configura i parametri SLA per priorità
- Configura i template email (oggetto e corpo)
- Gestisce le risposte rapide (canned responses)
- Esegue la pulizia degli allegati dei ticket chiusi

---

## 4. Funzionalità implementate

### Autenticazione
- **Login** con email e password
- **Auto-registrazione**: l'utente compila il form, riceve un codice di verifica via email (6 cifre, valido 15 minuti) e lo conferma
- Possibilità di limitare la registrazione a uno specifico dominio email (`ALLOWED_EMAIL_DOMAIN`)
- **Password temporanea**: gli account creati dall'admin richiedono il cambio password al primo accesso (`mustChangePassword`)
- Sessione gestita con cookie HTTP-only firmati (`AUTH_SECRET`)

### Dashboard e filtri
- Tabella ticket con paginazione numerata (10 ticket per pagina)
- Indicatore badge rosso in header per ticket con nuova attività non letta
- **Filtri**: stato, priorità, categoria, richiedente, assegnatario, testo libero, intervallo di date
- **Ordinamento** su qualsiasi colonna (Titolo, Richiedente, Priorità, Stato, Creato/Modificato)
- **Esportazione CSV** dei ticket filtrati
- Badge SLA (⚠ in ritardo / ⏱ in scadenza) direttamente sulla riga del ticket

### Azioni in blocco (bulk actions)
- Selezione multipla tramite checkbox
- Cambio stato massivo (In lavorazione / Risolto / Chiuso)
- Assegnazione massiva a un tecnico (o rimozione assegnazione)
- Barra azione flottante in basso quando almeno un ticket è selezionato

### Gestione ticket
- Apertura ticket con: titolo, descrizione, categoria, priorità, allegati
- **Modelli (template)**: pre-compilazione del form da un template configurato
- Staff può aprire ticket **per conto di** un altro utente tramite dropdown "Richiedente"
- Cronologia completa degli eventi (creazione, cambi stato, assegnazioni, risoluzione)
- Commenti pubblici e note interne per lo staff
- **Menzioni** nei commenti (`@nome`) con notifica email all'utente menzionato
- **Allegati** su ticket e commenti (limite configurabile, default 25 MB)
- Tag colorati assegnabili liberamente
- Pulsante "Chiudi" per il richiedente, "Riapri" per tutti
- Pulsante "Elimina" solo per ADMIN

### Etichette (tag)
- Creazione, modifica nome/colore, eliminazione
- Ricerca tag in tempo reale nel pannello di gestione
- Tag visualizzati sulla dashboard come chip colorati

### Modelli ticket (template)
- L'admin IT può creare template con titolo, descrizione, categoria e priorità pre-impostati
- Il richiedente o lo staff seleziona un template prima di compilare il form
- I template sono modificabili ed eliminabili dalla sezione Admin → Gestione → Modelli

### Risposte rapide (canned responses)
- Testi predefiniti riutilizzabili per rispondere velocemente ai ticket
- Gestione nella sezione Admin → Admin → Risposte rapide
- Inseribili nei commenti con un click (dropdown)

### Report
- KPI principali: ticket aperti, tasso di risoluzione, tempo medio di risoluzione, tempo medio di prima risposta IT
- Distribuzione per categoria (grafico a barre orizzontali)
- Distribuzione per priorità (grafico donut)
- Tabella per tecnico: ticket assegnati, risolti, tempo medio risoluzione, tempo medio prima risposta
- Filtro per intervallo di date
- **Stampa** ottimizzata (nasconde la navigazione, mostra solo il contenuto)

### Impostazioni di sistema (solo ADMIN)
- Nome applicazione
- Colore brand principale (color picker)
- Logo aziendale (PNG/SVG, max 5 MB) — rimpiazza il badge con le iniziali
- Favicon personalizzata
- Configurazione SLA per priorità (ore per URGENT / HIGH / MEDIUM / LOW)
- Abilitazione/disabilitazione delle email
- Configurazione template email (oggetto e corpo con variabili `{{placeholder}}`)
- Numero di giorni per i promemoria automatici
- Abilitazione del digest giornaliero per lo staff IT
- Pulizia allegati dei ticket chiusi (con riepilogo spazio occupato)

### Tema visivo
- **Tre modalità**: Chiaro ☀️ / Scuro 🌙 / Automatico 💻 (segue le preferenze del sistema operativo)
- Toggle nel header in alto a destra
- La scelta viene salvata in `localStorage` e applicata prima del render (nessun flash al caricamento)
- Tutti i colori usano variabili CSS (`var(--background)`, `var(--surface)`, `var(--foreground)`, `var(--muted)`, `var(--border)`)

---

## 5. Database — schema Prisma

```
User
├── id, email, name, passwordHash, role (ADMIN|IT|USER)
├── active, mustChangePassword, emailVerifiedAt
├── totpSecret, totpEnabled          ← predisposto per 2FA TOTP (non attivo)
├── verificationCodeHash / ExpiresAt ← codice di verifica email
└── relazioni: ticketsCreated, ticketsAssigned, comments, attachments, ticketViews

Ticket
├── id, title, description
├── status (OPEN|IN_PROGRESS|WAITING_ON_USER|RESOLVED|CLOSED)
├── priority (LOW|MEDIUM|HIGH|URGENT)
├── category (HARDWARE|SOFTWARE|NETWORK|ACCOUNT|OTHER)
├── requesterId → User, assigneeId → User?
├── createdAt, updatedAt, resolvedAt?, closedAt?
└── relazioni: comments, attachments, events, views, tags (many-to-many)

Comment
├── id, body, internal (nota interna se true)
├── ticketId → Ticket, authorId → User
└── attachments

Attachment
├── id, filename, mimeType, sizeBytes, storageKey (nome file su disco)
├── ticketId, commentId?, uploadedById
└── File salvati in /app/uploads (volume Docker persistente)

TicketEvent
├── id, type (CREATED|STATUS_CHANGED|ASSIGNED|UNASSIGNED|CLOSED|REOPENED|...)
├── meta (JSON con dati aggiuntivi, es. { from, to } per cambio stato)
├── ticketId, actorId → User?
└── createdAt

Tag              ← Etichette colorate (many-to-many con Ticket)
TicketTemplate   ← Modelli di ticket pre-compilati
CannedResponse   ← Risposte rapide per lo staff
TicketView       ← Traccia l'ultima visualizzazione (per badge "non letto")

Setting          ← Riga singleton (id="app") con tutte le impostazioni di sistema
```

---

## 6. Variabili d'ambiente

Configurate nel file `.env` nella root del progetto (o direttamente nel `docker-compose.yml`):

| Variabile | Obbligatoria | Default | Descrizione |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Stringa connessione PostgreSQL |
| `AUTH_SECRET` | ✅ | — | Chiave per firmare i cookie di sessione (min. 32 caratteri) |
| `SMTP_HOST` | ✅ | — | Hostname del server SMTP interno |
| `SMTP_PORT` | — | `25` | Porta SMTP |
| `SMTP_SECURE` | — | `false` | `true` per TLS/SSL |
| `SMTP_USER` | — | — | Username SMTP (opzionale se no-auth) |
| `SMTP_PASS` | — | — | Password SMTP |
| `SMTP_FROM` | ✅ | — | Indirizzo mittente email (es. `support@azienda.it`) |
| `APP_URL` | ✅ | `http://localhost:3000` | URL pubblico dell'app (usato nei link email) |
| `ALLOWED_EMAIL_DOMAIN` | — | — | Se impostato, solo email di questo dominio possono registrarsi (es. `sanco.it`) |
| `MAX_UPLOAD_SIZE_MB` | — | `25` | Dimensione massima allegati in MB |
| `UPLOADS_DIR` | — | `/app/uploads` | Percorso directory allegati (nel container) |
| `POSTGRES_USER` | — | `it_tickets` | Utente PostgreSQL (usato nel compose) |
| `POSTGRES_PASSWORD` | ✅ | — | Password PostgreSQL |
| `POSTGRES_DB` | — | `it_tickets` | Nome database |
| `CRON_SECRET` | — | — | Token per autenticare le chiamate cron (`x-cron-secret` header) |

**Esempio `.env`:**
```env
DATABASE_URL=postgresql://it_tickets:CAMBIA_QUESTA_PASSWORD@postgres:5432/it_tickets
AUTH_SECRET=una-stringa-casuale-di-almeno-32-caratteri
SMTP_HOST=mail.sanco.it
SMTP_PORT=25
SMTP_FROM=support@sanco.it
APP_URL=https://support.sanco.it
POSTGRES_PASSWORD=CAMBIA_QUESTA_PASSWORD
CRON_SECRET=un-altro-token-segreto
ALLOWED_EMAIL_DOMAIN=sanco.it
```

---

## 7. Deploy con Docker Compose

### Primo avvio

```bash
# 1. Clona il repository
git clone <url-repo> && cd IT_Tickets

# 2. Crea il file .env con le variabili sopra
cp .env.example .env   # poi edita con i valori reali

# 3. Avvia tutto
docker compose up -d
```

Al primo avvio il servizio `migrate` esegue automaticamente tutte le migration Prisma e crea le tabelle nel database. Dopo il completamento, il servizio `app` si avvia sulla porta `3000`.

### Aggiornamento a una nuova versione

```bash
git pull
docker compose build
docker compose up -d
```

Il servizio `migrate` riesegue solo le migration non ancora applicate.

### Servizi nel Compose

| Servizio | Immagine | Ruolo |
|---|---|---|
| `postgres` | `postgres:16-alpine` | Database PostgreSQL con volume persistente |
| `migrate` | Build locale (target `builder`) | Esegue `prisma migrate deploy` all'avvio, poi termina |
| `app` | Build locale (target `runner`) | Applicazione Next.js sulla porta 3000 |
| `cron` | `alpine:3` | Esegue i cron job giornalieri (promemoria + digest) |

### Volume persistenti

- `postgres_data` — dati del database
- `uploads_data` — allegati caricati dagli utenti (montato in `/app/uploads`)

### Primo account ADMIN

Dopo il primo avvio, crea manualmente il primo utente admin tramite psql o un client SQL:

```sql
-- Genera un hash bcrypt della password con: node -e "const b=require('bcryptjs');b.hash('PASSWORD',12).then(console.log)"
INSERT INTO "User" (id, email, name, "passwordHash", role, "emailVerifiedAt", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@sanco.it',
  'Amministratore',
  '$2a$12$HASH_GENERATO_SOPRA',
  'ADMIN',
  NOW(),
  NOW(),
  NOW()
);
```

In alternativa, registrarsi normalmente e poi promuovere il proprio account ad ADMIN direttamente nel database.

---

## 8. Struttura del codice sorgente

```
src/
├── app/
│   ├── (app)/                  ← Tutte le pagine autenticate (layout con header)
│   │   ├── layout.tsx          ← Header con navigazione, theme toggle
│   │   ├── nav-dropdown.tsx    ← Componente dropdown della nav (client)
│   │   ├── unread-badge.tsx    ← Badge contatore ticket non letti (polling 30s)
│   │   ├── dashboard/
│   │   │   ├── page.tsx        ← Server component: fetch ticket, SLA, paginazione
│   │   │   ├── ticket-table.tsx← Client component: tabella interattiva, bulk actions
│   │   │   └── filter-bar.tsx  ← Filtri (form GET)
│   │   ├── tickets/
│   │   │   ├── new/            ← Form apertura ticket (con template e richiedente)
│   │   │   └── [id]/           ← Dettaglio ticket, commenti, allegati, eventi
│   │   ├── reports/            ← Dashboard reportistica con grafici
│   │   ├── admin/
│   │   │   ├── users/          ← Gestione utenti (ADMIN)
│   │   │   ├── tags/           ← Gestione etichette (IT+ADMIN)
│   │   │   ├── templates/      ← Modelli ticket (IT+ADMIN)
│   │   │   ├── canned-responses/ ← Risposte rapide (ADMIN)
│   │   │   └── settings/       ← Impostazioni sistema (ADMIN)
│   │   └── account/            ← Profilo e cambio password dell'utente corrente
│   ├── actions/                ← Server Actions (mutazioni dati)
│   │   ├── tickets.ts          ← CRUD ticket, bulk actions
│   │   ├── auth.ts             ← Login, logout
│   │   ├── register.ts         ← Auto-registrazione + verifica email
│   │   ├── users.ts            ← Gestione utenti (admin)
│   │   ├── tags.ts             ← CRUD tag
│   │   ├── templates.ts        ← CRUD modelli ticket
│   │   ├── canned-responses.ts ← CRUD risposte rapide
│   │   ├── settings.ts         ← Salvataggio impostazioni
│   │   ├── attachments.ts      ← Upload e cancellazione allegati
│   │   └── account.ts          ← Modifica profilo, cambio password
│   ├── api/
│   │   ├── attachments/[id]/   ← Download sicuro allegati (auth check)
│   │   ├── branding/           ← Serving logo e favicon
│   │   ├── cron/
│   │   │   ├── reminders/      ← Promemoria ticket inattivi
│   │   │   └── digest/         ← Digest giornaliero per staff IT
│   │   ├── tickets/export/     ← Export CSV ticket filtrati
│   │   └── unread-count/       ← Contatore badge non letti (polling)
│   ├── login/                  ← Pagina di accesso
│   ├── register/               ← Auto-registrazione + verifica codice
│   ├── change-password/        ← Cambio password obbligatorio primo accesso
│   ├── layout.tsx              ← Root layout (font, brand color, theme init script)
│   ├── brand.tsx               ← Componenti logo/badge aziendale
│   ├── theme-toggle.tsx        ← Toggle tema chiaro/scuro/auto
│   ├── local-time.tsx          ← Data/ora nel fuso locale del browser
│   └── globals.css             ← Design tokens, dark mode, componenti CSS
├── lib/
│   ├── dal.ts                  ← Data Access Layer (getCurrentUser, guard auth)
│   ├── prisma.ts               ← Istanza singleton Prisma Client
│   ├── mail.ts                 ← Invio email via Nodemailer
│   ├── settings.ts             ← Lettura/cache impostazioni + renderTemplate
│   ├── sla.ts                  ← Calcolo SLA (stato ok/warning/overdue)
│   ├── session.ts              ← Gestione cookie sessione (iron-session)
│   ├── attachments.ts          ← Salvataggio/cancellazione file su disco
│   ├── ticket-labels.ts        ← Label e classi CSS per stato/priorità
│   ├── render-mentions.tsx     ← Parser @menzioni nei commenti
│   ├── verification-code.ts    ← Generazione e hash codice verifica email
│   ├── format-bytes.ts         ← Formattazione dimensione file
│   └── query-params.ts         ← Utility gestione URL search params
└── generated/prisma/           ← Client Prisma generato automaticamente
```

---

## 9. Email e notifiche

Le email vengono inviate tramite il server SMTP configurato nelle variabili d'ambiente. Il sistema non utilizza servizi terzi (SendGrid, Mailgun, ecc.).

### Trigger di notifica

| Evento | Destinatario |
|---|---|
| Nuovo ticket aperto | Tutto lo staff IT attivo |
| Ticket assegnato | Tecnico assegnatario |
| Cambio di stato | Richiedente |
| Nuovo commento pubblico | Richiedente (se autore ≠ richiedente) |
| Menzione `@nome` nel commento | Utente menzionato |
| Promemoria ticket inattivo | Tecnico assegnatario |
| Digest giornaliero | Tutto lo staff IT attivo |

### Template email

Ogni template è configurabile dall'admin con variabili `{{placeholder}}`:

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

Dall'admin → Impostazioni si impostano le ore per ogni livello:
- URGENT: es. 4 ore
- HIGH: es. 8 ore
- MEDIUM: es. 24 ore
- LOW: es. 72 ore

Se un valore è lasciato vuoto, quella priorità non ha SLA.

### Calcolo e visualizzazione

Lo SLA è calcolato a partire dalla data di creazione del ticket:

- **Verde** (ok): tempo rimanente > 20% del totale
- **Arancione** ⏱ (warning): tempo rimanente ≤ 20% ma non ancora scaduto
- **Rosso** ⚠ (overdue): tempo scaduto

Lo stato SLA appare sulla dashboard accanto allo stato del ticket e sulla pagina di dettaglio. I ticket chiusi/risolti non mostrano lo SLA.

---

## 11. Cron job automatici

Il container `cron` (Alpine Linux) esegue due chiamate HTTP ogni giorno alle **07:00**:

### `/api/cron/reminders`
Invia email di promemoria al tecnico assegnatario per ogni ticket:
- Non chiuso/risolto
- Con un assegnatario
- Senza commenti negli ultimi N giorni (configurabile in Impostazioni)

### `/api/cron/digest`
Invia allo staff IT un riepilogo mattutino dei ticket aperti (se il digest è abilitato in Impostazioni).

Entrambe le API sono protette dall'header `x-cron-secret` che deve corrispondere a `CRON_SECRET`.

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

### Variabili CSS

Tutti i colori dell'interfaccia usano variabili CSS:

```css
:root {
  --background: #f4f5f7;
  --foreground: #111827;
  --surface:    #ffffff;
  --border:     #e5e7eb;
  --muted:      #6b7280;
  --brand:      (dal database — colore brand aziendale)
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

Di seguito le funzionalità non ancora implementate, ordinate per priorità.

### Alta priorità

#### 🔐 Autenticazione a due fattori (2FA TOTP)
Lo schema database include già i campi `totpSecret` e `totpEnabled` sul modello `User`. Manca l'implementazione:
- Schermata di configurazione 2FA con QR code (app Authenticator)
- Verifica OTP al login
- Disabilitazione 2FA con codice di backup
- **File da creare**: `src/app/(app)/account/2fa/page.tsx`, `src/app/login/totp-form.tsx`
- **Libreria suggerita**: `otpauth` o `speakeasy`

#### 📱 Menu mobile / hamburger
La navigazione è nascosta su schermi piccoli (`hidden sm:flex`). Manca un menu hamburger per mobile:
- Pulsante ☰ visibile solo su mobile
- Drawer laterale o menu espandibile con tutti i link
- **File da modificare**: `src/app/(app)/layout.tsx`, aggiungere un `MobileNav` client component

#### 🔔 Notifiche in-app (real-time)
Attualmente le notifiche arrivano solo via email. Un sistema di notifiche in-app richiederebbe:
- Modello `Notification` nel database
- Badge in header (già presente per i non letti, ma solo per i ticket)
- Lista notifiche a click
- Eventuale integrazione WebSocket o Server-Sent Events per aggiornamento live

### Media priorità

#### 🔍 Ricerca full-text avanzata
La ricerca attuale usa `contains` su titolo e descrizione. Migliorabile con:
- Indice full-text PostgreSQL (`@@` operator, `to_tsvector`)
- Ricerca anche nel corpo dei commenti
- Risultati ordinati per rilevanza

#### 📎 Anteprima allegati
Gli allegati attualmente sono scaricabili ma non visualizzabili inline. Aggiungere:
- Preview immagini direttamente nel thread del ticket
- Preview PDF nel browser

#### 🔄 Aggiornamento automatico del ticket
La pagina dettaglio ticket non si aggiorna automaticamente quando un altro utente aggiunge un commento. Opzioni:
- Polling ogni 30 secondi (come già fatto per il badge non letti)
- Server-Sent Events per update in tempo reale

#### 📋 Vista Kanban
Alternativa alla tabella della dashboard: una board a colonne per stato (Aperto → In lavorazione → In attesa → Risolto) con drag & drop dei ticket.

#### ⏱ SLA per orari lavorativi
Attualmente lo SLA conta le ore di calendario (24/7). In un contesto aziendale reale è preferibile contare solo le ore lavorative (es. 8:00-18:00 da lunedì a venerdì).
- Configurare la finestra lavorativa nelle Impostazioni
- Modificare `src/lib/sla.ts` per escludere i weekend e le ore notturne

### Bassa priorità

#### 📧 Email HTML
Le email inviate sono in testo semplice. Aggiungere template HTML con brand color e logo per un aspetto più professionale.
- **Librerie suggerite**: `@react-email/components` o `mjml`

#### 📊 Report avanzati e grafici interattivi
La pagina Report potrebbe includere:
- Grafico trend ticket nel tempo (line chart)
- Filtri per tecnico specifico
- Export PDF del report

#### 🏷️ Categorie personalizzabili
Le categorie ticket (HARDWARE, SOFTWARE, NETWORK, ACCOUNT, OTHER) sono attualmente fisse (enum Prisma). Renderle configurabili richiede:
- Nuovo modello `TicketCategory` nel database
- Migration per spostare le categorie da enum a tabella
- Gestione CRUD nella sezione admin

#### 🌐 Internazionalizzazione (i18n)
L'interfaccia è attualmente solo in italiano. Per supportare più lingue:
- Adottare `next-intl` o `next-i18next`
- Estrarre tutte le stringhe in file di traduzione
- Selector di lingua nelle impostazioni utente

#### 📱 App mobile (PWA)
L'applicazione è già responsive ma non è configurata come Progressive Web App. Aggiungere:
- `manifest.json` con icone e colore tema
- Service Worker per notifiche push native

---

## Note di sviluppo

### Aggiungere una migration Prisma

```bash
# Modifica prisma/schema.prisma, poi:
npx prisma migrate dev --name nome_della_migration

# In produzione (Docker), la migration viene applicata automaticamente all'avvio
# tramite il servizio `migrate` nel docker-compose.yml
```

### Rigenerare il client Prisma

```bash
npx prisma generate
```

### Lanciare l'app in sviluppo locale

```bash
npm install
# Serve un PostgreSQL locale o usa Docker:
docker compose up postgres -d
npx prisma migrate deploy
npm run dev
```

### Accedere al database in produzione

```bash
docker compose exec postgres psql -U it_tickets it_tickets
```

---

*Documento generato il 15 luglio 2026 — versione corrente del progetto.*
