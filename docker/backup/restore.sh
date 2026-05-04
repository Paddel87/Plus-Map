#!/usr/bin/env bash
# HC-Map restore script (M10.6, ADR-051 §D).
#
# Run this interactively, against a manually mounted age private key.
# The container does NOT carry the private key — that lives with the
# operator (passwort manager / 2-person split, see ops/runbook.md).
#
# Typical invocation (operator on the docker host):
#
#   docker run --rm -it \
#     --network hc-map_internal \
#     -e HCMAP_BACKUP_REMOTE=rb \
#     -e HCMAP_BACKUP_PREFIX=hc-map \
#     -e AGE_IDENTITY_FILE=/run/secrets/age-identity.txt \
#     -v ./secrets/rclone.conf:/run/secrets/rclone.conf:ro \
#     -v $HOME/secret/hc-map.age.key:/run/secrets/age-identity.txt:ro \
#     ghcr.io/paddel87/hc-map-backup:rc \
#     /usr/local/bin/restore.sh \
#       daily/20260501T031700Z.dump.age \
#       'postgresql://postgres:secret@db:5432/hcmap_restore'
#
# Exit codes:
#   0   success (target db now contains the restored dump)
#   64  invalid arguments
#   66  required secret missing
#   >0  rclone / age / pg_restore failure

set -euo pipefail

usage() {
    cat <<'EOF'
usage: restore.sh <archive-key> <target-pg-url>

  archive-key   path under HCMAP_BACKUP_PREFIX on HCMAP_BACKUP_REMOTE,
                e.g. daily/20260501T031700Z.dump.age
  target-pg-url libpq URL of an EMPTY target database, e.g.
                postgresql://postgres:secret@localhost:5432/hcmap_restore

required env:
  HCMAP_BACKUP_REMOTE     rclone remote name (e.g. "rb")
  HCMAP_BACKUP_PREFIX     prefix path on the remote (e.g. "hc-map")
  AGE_IDENTITY_FILE       path to the age private key (mount in!)

required mounts:
  /run/secrets/rclone.conf  rclone config (read-only)
  $AGE_IDENTITY_FILE        age identity (read-only)

This script never touches the running production database — pg_restore
runs against the URL you pass in, which MUST point to an empty restore DB.
EOF
}

if [[ $# -lt 2 ]]; then
    usage
    exit 64
fi

key=$1
target_url=$2

: "${HCMAP_BACKUP_REMOTE:?HCMAP_BACKUP_REMOTE is required}"
: "${HCMAP_BACKUP_PREFIX:?HCMAP_BACKUP_PREFIX is required}"
: "${AGE_IDENTITY_FILE:?AGE_IDENTITY_FILE must point to the age private key}"

rclone_conf=${HCMAP_RCLONE_CONFIG_FILE:-/run/secrets/rclone.conf}
if [[ ! -s "$rclone_conf" ]]; then
    echo "rclone config missing: $rclone_conf" >&2
    exit 66
fi
if [[ ! -s "$AGE_IDENTITY_FILE" ]]; then
    echo "age identity file missing or empty: $AGE_IDENTITY_FILE" >&2
    exit 66
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

src="${HCMAP_BACKUP_REMOTE}:${HCMAP_BACKUP_PREFIX}/${key}"
log() { printf '[%s] [restore] %s\n' "$(date -u +%FT%TZ)" "$*"; }

log "fetch  $src"
rclone --config "$rclone_conf" copyto "$src" "$tmp/archive.dump.age"

log "decrypt"
age --decrypt --identity "$AGE_IDENTITY_FILE" \
    -o "$tmp/archive.dump" "$tmp/archive.dump.age"

log "pg_restore → ${target_url%%@*}@…"
pg_restore --no-owner --no-acl --exit-on-error \
    --dbname="$target_url" \
    "$tmp/archive.dump"

log "done"
