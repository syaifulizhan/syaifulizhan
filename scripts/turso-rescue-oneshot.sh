#!/usr/bin/env bash
# Pemulihan Turso AUTO (one-shot) — dipanggil oleh launchd jam 8:10 pagi selepas
# reset writes 1 Jul. Jalan pemulihan perawi, sahkan, kemudian buang jadual SENDIRI
# kalau berjaya (kalau gagal/kuota belum reset → kekal, cuba lagi esok 8:10).
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
REPO="$HOME/Projects/syaifulizhan"
LOG="$HOME/dewan-turso-rescue.log"
LABEL="my.dewan.turso-rescue"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

{
  echo "════════ $(date '+%Y-%m-%d %H:%M:%S %Z') : cek Turso ════════"
  cd "$REPO" || { echo "✗ repo $REPO tiada"; exit 1; }

  # PROBE dulu: adakah tulisan dibenarkan? (akaun boleh kekal BLOCKED walau kuota reset)
  SYNC_URL="$(turso db show dewan-hadis --url 2>/dev/null)"
  SYNC_TOKEN="$(turso db tokens create dewan-hadis 2>/dev/null)"
  WRITABLE=$(TURSO_SYNC_URL="$SYNC_URL" TURSO_SYNC_TOKEN="$SYNC_TOKEN" node -e '
    import("@libsql/client").then(async ({createClient})=>{
      const db=createClient({url:process.env.TURSO_SYNC_URL,authToken:process.env.TURSO_SYNC_TOKEN});
      try{ await db.execute("CREATE TABLE IF NOT EXISTS __probe(x)");
           await db.execute("DROP TABLE __probe"); console.log("YES"); }
      catch(e){ console.log("NO"); }
    })' 2>/dev/null)
  if [ "$WRITABLE" != "YES" ]; then
    echo "⏳ Turso masih BLOCKED (writes forbidden) — cuba lagi 30 min lagi."
    echo; exit 0
  fi
  echo "✓ Turso boleh ditulis — mula pemulihan."

  # Jalankan pemulihan terpilih (preflight + skop perawi + buang legasi)
  bash scripts/turso-sync.sh dewan-hadis --force

  # Sahkan selepas: precheck patut SELARI (exit 0)
  echo "---- sahkan selepas pemulihan ----"
  SYNC_URL="$(turso db show dewan-hadis --url 2>/dev/null)"
  SYNC_TOKEN="$(turso db tokens create dewan-hadis 2>/dev/null)"
  if TURSO_SYNC_URL="$SYNC_URL" TURSO_SYNC_TOKEN="$SYNC_TOKEN" node scripts/turso-precheck.mjs; then
    echo "✓ SELARI — pemulihan BERJAYA. Buang jadual berjadual (one-shot selesai)."
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null
    rm -f "$PLIST"
  else
    echo "✗ MASIH BEZA — mungkin kuota belum reset / terputus. Kekal berjadual, cuba lagi esok 8:10."
  fi
  echo "════════ $(date '+%Y-%m-%d %H:%M:%S %Z') : TAMAT ════════"
  echo
} >> "$LOG" 2>&1
