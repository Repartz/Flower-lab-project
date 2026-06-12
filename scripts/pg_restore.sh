#!/bin/bash
# Скрипт для восстановления базы данных из бэкапа
# Использование: ./pg_restore.sh flowerlab_backup_XXXXXXXX_XXXXXX.sql

set -e

source ../.env

DB_URL="$DATABASE_URL"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Укажите файл бэкапа: ./pg_restore.sh flowerlab_backup.sql"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Файл не найден: $BACKUP_FILE"
  exit 1
fi

echo "Внимание! Это перезапишет текущую базу данных."
read -p "Продолжить? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "Отмена."
  exit 0
fi

echo "Восстановление из $BACKUP_FILE..."
psql "$DB_URL" -f "$BACKUP_FILE"
echo "Восстановление завершено."
