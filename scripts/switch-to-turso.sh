#!/usr/bin/env bash
# Tukar laman ke DB Turso bersatu — SAHKAN dahulu, baru tukar secret.
#
# Setiap langkah berhenti kalau gagal (set -e), jadi mustahil separuh-jalan:
# secret TIDAK akan ditukar melainkan kesemua 15 jadual padan dgn fail sumber.
#
#   bash scripts/switch-to-turso.sh <nama-db> <fail-sumber.db>
#
# Selepas ini: buang revert D1 (git revert <sha-revert>) + push → deploy.
set -euo pipefail
cd "$(dirname "$0")/.."

DB="${1:?guna: switch-to-turso.sh <nama-db> <fail-sumber.db>}"
SRC="${2:?fail sumber diperlukan}"
export TURSO_API_TOKEN="${TURSO_API_TOKEN:-$(grep '^TURSO_API_TOKEN=' .env.local | cut -d= -f2-)}"

echo "→ 1/4 Sahkan '$DB' boleh diquery ..."
URL=$(turso db show "$DB" --url)
TOK=$(turso db tokens create "$DB" -e never)
node -e "
const {createClient}=require('@libsql/client');
createClient({url:process.argv[1],authToken:process.argv[2]})
  .execute('select count(*) c from hadiths')
  .then(r=>{console.log('  ✓ hidup — hadiths='+Number(r.rows[0].c).toLocaleString());})
  .catch(e=>{console.error('  ✗ '+e.message);process.exit(1)});
" "$URL" "$TOK"

echo "→ 2/4 Banding cap-jari NILAI lawan $SRC ..."
node scripts/verify-unified.mjs "$DB" "$SRC"

echo "→ 3/4 Tukar secret Cloudflare ..."
printf '%s' "$URL" | npx wrangler secret put TURSO_DATABASE_URL >/dev/null
printf '%s' "$TOK" | npx wrangler secret put TURSO_AUTH_TOKEN >/dev/null
echo "  ✓ TURSO_DATABASE_URL + TURSO_AUTH_TOKEN dikemas → $DB"

echo "→ 4/4 Kuota (seed --from-file sepatutnya 0 writes) ..."
node scripts/turso-usage-guard.mjs || true

cat <<EOF

  ✓ SIAP. Langkah seterusnya (manual, sebab ia mencetuskan deploy):
      git revert --no-edit <sha-revert-D1>
      git push origin main

  ⚠️ JANGAN padam DB lama sehingga laman terbukti stabil beberapa waktu.
     Insiden 26 Ogos: padam DB lama sebaik migrasi menghapuskan satu-satunya
     rollback pantas bila v2 tersangkut di sebelah Turso.
EOF
