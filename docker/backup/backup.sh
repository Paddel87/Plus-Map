#!/usr/bin/env bash
# HC-Map backup script (M10.6, ADR-051 §D).
#
#   pg_dump (custom format) | age (--recipients-file) | rclone rcat → remote
#
# Invoked by cron (daily/weekly/monthly) via run-backup wrapper.
# Exit codes:
#   0   success
#   64  invalid arguments
#   65  age recipients secret missing/empty
#   66  rclone config secret missing/empty
#   >0  any sub-process failure (set -o pipefail)

set -euo pipefail

period=${1:-daily}
case "$period" in
    daily | weekly | monthly) ;;
    *)
        echo "usage: backup.sh {daily|weekly|monthly}" >&2
        exit 64
        ;;
esac

: "${HCMAP_BACKUP_REMOTE:?HCMAP_BACKUP_REMOTE is required (rclone remote name)}"
: "${HCMAP_BACKUP_PREFIX:?HCMAP_BACKUP_PREFIX is required (path prefix on remote)}"
: "${PGHOST:?PGHOST is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${PGDATABASE:?PGDATABASE is required}"

age_recipients=${HCMAP_AGE_RECIPIENTS_FILE:-/run/secrets/age-recipients.txt}
rclone_conf=${HCMAP_RCLONE_CONFIG_FILE:-/run/secrets/rclone.conf}

if [[ ! -s "$age_recipients" ]]; then
    echo "age recipients file missing or empty: $age_recipients" >&2
    exit 65
fi
if [[ ! -s "$rclone_conf" ]]; then
    echo "rclone config missing or empty: $rclone_conf" >&2
    exit 66
fi

ts=$(date -u +%Y%m%dT%H%M%SZ)
target="${HCMAP_BACKUP_REMOTE}:${HCMAP_BACKUP_PREFIX}/${period}/${ts}.dump.age"

log() { printf '[%s] [backup:%s] %s\n' "$(date -u +%FT%TZ)" "$period" "$*"; }

log "start → $target"

pg_dump --format=custom --no-owner --no-acl --no-password \
    | age --recipients-file "$age_recipients" \
    | rclone --config "$rclone_conf" rcat "$target"

log "done"
