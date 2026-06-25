#!/usr/bin/env bash
# Backup corpus.db (master) → Google Drive via rclone. Snapshot KONSISTEN guna
# VACUUM INTO (tak perlu pause grind 14B yg menulis serentak).
#   bash scripts/backup-drive.sh
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
D=$(date +%Y-%m-%d)
SNAP=/tmp/corpus-snap-$D.db
GZ=/tmp/corpus-master-$D.db.gz
REMOTE="gdrive:syaifulizhan.my"

echo "→ Snapshot konsisten (VACUUM INTO)…"
rm -f "$SNAP" "$GZ"
node -e "const{createClient}=require('@libsql/client');const db=createClient({url:'file:./data/corpus.db'});(async()=>{await db.execute(\"VACUUM INTO '$SNAP'\");db.close();})().catch(e=>{console.error(e.message);process.exit(1);});"
echo "→ Mampat…"
gzip -c "$SNAP" > "$GZ"
SZ=$(ls -la "$GZ" | awk '{print int($5/1048576)"M"}')
echo "→ Upload ke $REMOTE ($SZ)…"
rclone copy "$GZ" "$REMOTE/" --progress
rm -f "$SNAP" "$GZ"
echo "✓ Backup siap: $REMOTE/corpus-master-$D.db.gz"
