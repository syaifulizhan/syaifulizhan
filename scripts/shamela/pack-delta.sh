#!/usr/bin/env bash
# Pack an import-book.mjs delta bundle into a release asset for the "Import delta" workflow.
#   bash scripts/shamela/pack-delta.sh <bundle-dir> <name>      e.g.  ... c.db.delta delta-345-ibn-khuzayma
# Writes ./<name>.tar.gz (files at the archive root), after checking the 4 required files, and reports the size.
# Upload (creates the release on first use; never commit the asset to git):
#   gh release view import-deltas >/dev/null 2>&1 || gh release create import-deltas --title "Import deltas" --notes "Importer delta bundles (assets only)" --prerelease
#   gh release upload import-deltas <name>.tar.gz --clobber
# Then run Actions -> "Import delta" with asset=<name>.tar.gz (mode dry-run first).
set -euo pipefail
dir="${1:?usage: pack-delta.sh <bundle-dir> <name>}"
name="${2:?usage: pack-delta.sh <bundle-dir> <name>}"
name="${name%.tar.gz}"
[[ "$name" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "bad name: $name" >&2; exit 2; }
for f in delta.sql rollback.sql rollback-backup.json stats.json; do
  [[ -s "$dir/$f" ]] || { echo "missing or empty: $dir/$f" >&2; exit 1; }
done
out="${name}.tar.gz"
# Only what the runner needs (the *.jsonl review files stay local).
tar -czf "$out" -C "$dir" delta.sql rollback.sql rollback-backup.json stats.json
bytes=$(wc -c < "$out" | tr -d ' ')
echo "packed $out: $bytes bytes ($(( (bytes + 1048575) / 1048576 )) MiB)"
# GitHub release assets may be up to 2 GiB; a single-book delta is a few MiB.
if (( bytes > 2000 * 1024 * 1024 )); then echo "too large for a release asset" >&2; exit 1; fi
if (( bytes > 50 * 1024 * 1024 )); then echo "warning: >50 MiB, check that this is really one book" >&2; fi
tar -tzf "$out"
