#!/usr/bin/env bash
# Pemantau usage Turso (baca sahaja) — log tiap kali dipanggil launchd (4 jam).
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$HOME/Projects/syaifulizhan" || exit 0
LOG="$HOME/dewan-turso-usage.log"
OUT=$(rm -f /tmp/turso_diff.txt; node scripts/turso-usage-guard.mjs 2>&1 | tr '\n' ' ')
echo "$(date '+%Y-%m-%d %H:%M') $OUT" >> "$LOG"
