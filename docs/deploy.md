# Deploy su VM ESXi

## Prerequisiti sulla VM

- Docker Engine + plugin Docker Compose
- Container Nginx Proxy Manager (NPM) già attivo sulla stessa rete Docker/host
- Accesso di rete al server SMTP interno aziendale

## Setup iniziale

```bash
git clone <repo> IT_Tickets
cd IT_Tickets
cp .env.example .env
```

Modifica `.env` con:

| Variabile | Esempio | Note |
|---|---|---|
| `POSTGRES_PASSWORD` | `sicura123` | Obbligatoria |
| `AUTH_SECRET` | `$(openssl rand -base64 32)` | Min. 32 caratteri |
| `APP_URL` | `https://ticket.azienda.local` | URL pubblico (usato nei link email) |
| `ALLOWED_EMAIL_DOMAIN` | `azienda.it` | Lascia vuoto per non limitare la registrazione |
| `CRON_SECRET` | `$(openssl rand -base64 24)` | Token per le chiamate cron |

### Provider email

Il provider attivo si sceglie da **Impostazioni → Email** nell'interfaccia admin (salvato nel database). Le credenziali rimangono nel `.env` e richiedono un riavvio del server se cambiate.

**SMTP (default)**

| Variabile | Esempio | Note |
|---|---|---|
| `SMTP_HOST` | `mail.azienda.local` | Server SMTP interno |
| `SMTP_PORT` | `25` | Default 25 |
| `SMTP_SECURE` | `false` | `true` per TLS porta 465 |
| `SMTP_USER` | *(vuoto)* | Lascia vuoto se il relay non richiede auth |
| `SMTP_PASS` | *(vuoto)* | |
| `SMTP_FROM` | `support@azienda.it` | Mittente visualizzato |

**Microsoft Graph API (Office 365)**

Registra un'app in Azure AD con il permesso applicativo `Mail.Send`, poi imposta:

| Variabile | Note |
|---|---|
| `GRAPH_TENANT_ID` | ID del tenant Azure AD (GUID) |
| `GRAPH_CLIENT_ID` | ID applicazione (client) registrata in Azure |
| `GRAPH_CLIENT_SECRET` | Segreto client dell'app Azure |
| `GRAPH_SENDER_EMAIL` | Casella mittente (es. `support@azienda.onmicrosoft.com`) |

La pagina **Impostazioni → Email** mostra in tempo reale quali di queste variabili sono configurate, così puoi verificare prima di attivare il provider Graph.

Avvia i servizi:

```bash
docker compose up -d
```

Il servizio `migrate` applica tutte le migration del database prima che `app` parta.

### Primo account ADMIN

```bash
docker compose run --rm migrate npx prisma db seed
```

Il seed usa `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` dal file `.env`. In alternativa, registrarsi normalmente tramite il portale e promuovere l'account ad ADMIN direttamente nel database:

```bash
docker compose exec postgres psql -U it_tickets it_tickets \
  -c "UPDATE \"User\" SET role='ADMIN' WHERE email='tua@email.it';"
```

## Aggiornamenti

### Script automatico (raccomandato)

Il repository contiene `deploy.sh` che esegue tutto in sequenza:

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

Lo script usa `set -e` e si ferma al primo errore, evitando di avviare container su una build rotta.

### Prima esecuzione dello script

```bash
chmod +x ~/IT_Tickets/deploy.sh
```

## Servizi Docker Compose

| Servizio | Immagine | Ruolo |
|---|---|---|
| `postgres` | `postgres:16-alpine` | Database con volume persistente |
| `migrate` | Build locale (target `builder`) | Esegue `prisma migrate deploy`, poi termina |
| `app` | Build locale (target `runner`) | App Next.js sulla porta `3000` |
| `cron` | `alpine:3` | Cron giornaliero (promemoria + digest + auto-chiusura) |

### Volumi persistenti

- `postgres_data` — dati del database
- `uploads_data` — allegati caricati dagli utenti (montato in `/app/uploads`)

## Collegamento a Nginx Proxy Manager

1. In NPM crea un nuovo **Proxy Host**
2. **Domain**: dominio interno (es. `ticket.azienda.local`)
3. **Forward Hostname/IP**: nome container `app` (se sulla stessa rete Docker) oppure IP della VM
4. **Forward Port**: `3000`
5. Abilita SSL con certificato Let's Encrypt o interno

> Se NPM gira in un container separato, assicurati che sia sulla stessa rete Docker di `app`, oppure pubblica la porta `3000` sull'host e punta NPM all'IP della VM.

## Allegati e spazio disco

Gli allegati vengono salvati nel volume `uploads_data`. Il limite per file è configurabile (`MAX_UPLOAD_SIZE_MB`, default 25 MB). In **Impostazioni → Archiviazione** trovi lo spazio occupato e il pulsante per eliminare gli allegati dei ticket chiusi da più di N giorni.

## Accesso diretto al database

```bash
docker compose exec postgres psql -U it_tickets it_tickets
```
