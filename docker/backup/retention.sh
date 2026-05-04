#!/usr/bin/env bash
# HC-Map retention sweep (M10.6, ADR-051 §D).
#
# Removes archives older than:
#   daily/   → 14d
#   weekly/  → 56d   (8 weeks)
#   monthly/ → 365d
#
# Per-period failures are logged but do not abort the whole sweep — a single
# unreachable bucket should not block retention on the others.

set -euo pipefail

: "${HCMAP_BACKUP_REMOTE:?HCMAP_BACKUP_REMOTE is required}"
: "${HCMAP_BACKUP_PREFIX:?HCMAP_BACKUP_PREFIX is required}"

rclone_conf=${HCMAP_RCLONE_CONFIG_FILE:-/run/secrets/rclone.conf}
if [[ ! -s "$rclone_conf" ]]; then
    echo "rclone config missing or empty: $rclone_conf" >&2
    exit 66
fi

log() { printf '[%s] [retention] %s\n' "$(date -u +%FT%TZ)" "$*"; }

declare -A RETENTION=(
    [daily]=14d
    [weekly]=56d
    [monthly]=365d
)

rc=0
for period in daily weekly monthly; do
    age=${RETENTION[$period]}
    path="${HCMAP_BACKUP_REMOTE}:${HCMAP_BACKUP_PREFIX}/${period}"
    # Skip silently when the bucket doesn't exist yet — that's the normal
    # state for weekly/monthly during the first month after deployment, and
    # for any newly-created backup target. `rclone lsf` exits non-zero on
    # missing dirs but writes nothing useful to stdout, so we suppress.
    if ! rclone --config "$rclone_conf" lsf --max-depth 1 "$path" >/dev/null 2>&1; then
        log "skip $path (no archives yet)"
        continue
    fi
    log "purge $path older than $age"
    if ! rclone --config "$rclone_conf" delete --min-age "$age" "$path"; then
        log "purge failed for $path (continuing)"
        rc=1
    fi
done

log "done (rc=$rc)"
exit "$rc"
