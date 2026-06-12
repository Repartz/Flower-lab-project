#!/bin/bash
# Скрипт для создания бэкапа базы данных (Neon PostgreSQL)
# Использование: ./pg_dump.sh

set -e

source ../.env

DB_URL="$DATABASE_URL"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="flowerlab_backup_${TIMESTAMP}.sql"

echo "Создание бэкапа базы данных..."
pg_dump "$DB_URL" --no-owner --no-acl -f "$BACKUP_FILE"
echo "Бэкап создан: $BACKUP_FILE"
echo "Размер: $(du -h "$BACKUP_FILE" | cut -f1)"
