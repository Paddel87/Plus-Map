#!/usr/bin/env bash
# HC-Map backup container entrypoint (M10.6).
#
# 1. Validate required env vars.
# 2. Verify docker secrets are mounted (rclone.conf, age-recipients.txt).
# 3. Verify the configured rclone remote actually exists in the config.
# 4. Render the env file consumed by run-backup / run-retention (cron jobs
#    do not inherit the entrypoint's environment, so we capture it here).
# 5. Optionally run an immediate backup (HCMAP_BACKUP_RUN_ON_START=1).
# 6. Hand off to the cron daemon.

set -euo pipefail

log() { printf '[%s] [entrypoint] %s\n' "$(date -u +%FT%TZ)" "$*"; }

require_env() {
    local name=$1
    if [[ -z "${!name:-}" ]]; then
        log "FATAL: $name is required"
        exit 78
    fi
}

require_env HCMAP_BACKUP_REMOTE
require_env HCMAP_BACKUP_PREFIX
require_env PGHOST
require_env PGUSER
require_env PGPASSWORD
require_env PGDATABASE
: "${PGPORT:=5432}"

age_recipients=${HCMAP_AGE_RECIPIENTS_FILE:-/run/secrets/age-recipients.txt}
rclone_conf=${HCMAP_RCLONE_CONFIG_FILE:-/run/secrets/rclone.conf}

if [[ ! -s "$age_recipients" ]]; then
    log "FATAL: age recipients secret missing or empty: $age_recipients"
    log "       mount docker/secrets/age-recipients.txt as a docker secret."
    exit 78
fi
if [[ ! -s "$rclone_conf" ]]; then
    log "FATAL: rclone config secret missing or empty: $rclone_conf"
    log "       mount docker/secrets/rclone.conf as a docker secret."
    exit 78
fi

# rclone listremotes prints "<name>:" per line. Verify the configured remote
# is present so we fail fast at startup rather than at 03:17 UTC.
if ! rclone --config "$rclone_conf" listremotes | grep -qx "${HCMAP_BACKUP_REMOTE}:"; then
    log "FATAL: rclone remote '${HCMAP_BACKUP_REMOTE}:' not found in $rclone_conf"
    log "       configured remotes:"
    rclone --config "$rclone_conf" listremotes | sed 's/^/         /' >&2 || true
    exit 78
fi

# Capture env for cron jobs (cron does not inherit the entrypoint's env).
# 0600 root-only — contains PGPASSWORD.
install -d -m 0700 /etc/hc-map
umask 077
{
    printf 'export HCMAP_BACKUP_REMOTE=%q\n'      "$HCMAP_BACKUP_REMOTE"
    printf 'export HCMAP_BACKUP_PREFIX=%q\n'      "$HCMAP_BACKUP_PREFIX"
    printf 'export HCMAP_AGE_RECIPIENTS_FILE=%q\n' "$age_recipients"
    printf 'export HCMAP_RCLONE_CONFIG_FILE=%q\n'  "$rclone_conf"
    printf 'export PGHOST=%q\n'                   "$PGHOST"
    printf 'export PGPORT=%q\n'                   "$PGPORT"
    printf 'export PGUSER=%q\n'                   "$PGUSER"
    printf 'export PGPASSWORD=%q\n'               "$PGPASSWORD"
    printf 'export PGDATABASE=%q\n'               "$PGDATABASE"
} > /etc/hc-map/backup.env
chmod 0600 /etc/hc-map/backup.env
umask 022

log "configured: remote=${HCMAP_BACKUP_REMOTE}: prefix=${HCMAP_BACKUP_PREFIX} db=${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}"
log "schedule: daily 03:17, weekly Sun 03:33, monthly 1st 03:47, retention 04:00 (UTC)"

if [[ "${HCMAP_BACKUP_RUN_ON_START:-0}" == "1" ]]; then
    log "HCMAP_BACKUP_RUN_ON_START=1 → running an immediate daily backup"
    /usr/local/bin/run-backup daily
fi

exec "$@"
