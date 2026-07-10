# IT Tickets

Gestionale ticket IT interno aziendale, costruito con Next.js (App Router) + TypeScript, Prisma/PostgreSQL e autenticazione autonoma.

## Funzionalità

- Creazione e gestione ticket con stato, priorità e categoria
- Ruoli: **Administrator** (superset di IT + gestione utenti/config), **IT** (gestione di tutti i ticket), **Utente** (crea e segue i propri ticket)
- Notifiche email via server SMTP interno aziendale
- Autenticazione con password (Argon2), pronta per estensione a 2FA (TOTP)

## Setup locale

```bash
cp .env.example .env   # configura DATABASE_URL, SMTP, AUTH_SECRET
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Deploy

Vedi [`docs/deploy.md`](./docs/deploy.md) per il deploy su VM ESXi con Docker Compose dietro Nginx Proxy Manager.
