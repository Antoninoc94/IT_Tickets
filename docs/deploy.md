# Deploy su VM ESXi

## Prerequisiti sulla VM

- Docker Engine + plugin Docker Compose
- Container Nginx Proxy Manager (NPM) già attivo sulla stessa rete Docker/host
- Accesso di rete al server SMTP interno aziendale

## Setup

```bash
git clone <repo> it-tickets
cd it-tickets
cp .env.example .env
```

Modifica `.env` con:

- `POSTGRES_PASSWORD`: password del database
- `AUTH_SECRET`: stringa casuale (`openssl rand -base64 32`)
- `SMTP_HOST` / `SMTP_PORT`: indirizzo del server di posta interno
- `APP_URL`: URL pubblico finale (es. `https://ticket.azienda.local`)
- `ALLOWED_EMAIL_DOMAIN`: dominio email aziendale a cui limitare l'auto-registrazione (es. `azienda.it`); lascia vuoto per non limitare

Avvia i servizi:

```bash
docker compose up -d --build
```

Il servizio `migrate` applica le migration del database prima che `app` parta. Al primo avvio crea anche l'utente amministratore iniziale (email/password da `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `.env`):

```bash
docker compose run --rm migrate npx prisma db seed
```

L'app Next.js resta in ascolto sulla porta `3000` del container `app`.

Gli allegati dei ticket vengono salvati sul volume Docker `uploads_data` (persistente tra i rebuild). Il limite per file (`MAX_UPLOAD_SIZE_MB`, default 25) si configura in `.env`. In Impostazioni → Spazio archiviazione trovi lo spazio totale occupato e un pulsante per eliminare gli allegati dei ticket chiusi da più di N giorni.

## Collegamento a Nginx Proxy Manager

1. In NPM crea un nuovo **Proxy Host**
2. Domain: il tuo dominio interno (es. `ticket.azienda.local`)
3. Forward Hostname/IP: il nome del container `app` (se NPM è sulla stessa rete Docker) oppure l'IP della VM
4. Forward Port: `3000`
5. Abilita SSL con certificato Let's Encrypt o interno, gestito direttamente da NPM

> Se NPM gira in un container separato, assicurati che sia sulla stessa rete Docker di `app`, oppure pubblica la porta `3000` sull'host e punta NPM all'IP della VM.

## Aggiornamenti

```bash
git pull
docker compose up -d --build
```

Le migration vengono riapplicate automaticamente dal servizio `migrate` ad ogni deploy.
