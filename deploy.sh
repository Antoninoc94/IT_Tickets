#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==> Pull aggiornamenti..."
git pull origin claude/it-ticket-management-app-qto7ln

echo "==> Stop container..."
docker compose down

echo "==> Build immagine..."
docker compose build

echo "==> Avvio container..."
docker compose up -d

echo "==> Deploy completato."
