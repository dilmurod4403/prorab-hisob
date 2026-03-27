#!/bin/sh
set -e

echo "DB migratsiya qilinmoqda..."

# DB tayyor bo'lguncha kutish (max 30 sekund)
MAX_RETRIES=10
RETRY=0
until npx prisma db push --skip-generate 2>/dev/null || [ $RETRY -eq $MAX_RETRIES ]; do
  RETRY=$((RETRY + 1))
  echo "DB tayyor emas, ${RETRY}/${MAX_RETRIES} kutilmoqda..."
  sleep 3
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  echo "DB ulanishda xato! Bot to'xtatilmoqda."
  exit 1
fi

echo "DB tayyor. Bot ishga tushmoqda..."
exec node dist/index.js
