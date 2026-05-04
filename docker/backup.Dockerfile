# syntax=docker/dockerfile:1.7
# Backup image (M10.6, ADR-051 §D): pg_dump | age | rclone, scheduled by cron.
# Base: debian bookworm-slim. pg_dump 16 ships from the PGDG apt repository
# (matches the postgis/postgis:16-3.5 db service in compose.prod.yml).

FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg; \
    install -d /usr/share/postgresql-common/pgdg; \
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
        -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc; \
    echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        postgresql-client-16 \
        age \
        rclone \
        cron \
        tini; \
    apt-get purge -y --auto-remove curl gnupg; \
    rm -rf /var/lib/apt/lists/*; \
    install -d -m 0755 /etc/hc-map /var/log

COPY docker/backup/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY docker/backup/backup.sh     /usr/local/bin/backup.sh
COPY docker/backup/restore.sh    /usr/local/bin/restore.sh
COPY docker/backup/retention.sh  /usr/local/bin/retention.sh
COPY docker/backup/run-backup    /usr/local/bin/run-backup
COPY docker/backup/run-retention /usr/local/bin/run-retention
COPY docker/backup/crontab       /etc/cron.d/hc-map-backup

RUN set -eux; \
    chmod 0755 \
        /usr/local/bin/entrypoint.sh \
        /usr/local/bin/backup.sh \
        /usr/local/bin/restore.sh \
        /usr/local/bin/retention.sh \
        /usr/local/bin/run-backup \
        /usr/local/bin/run-retention; \
    chmod 0644 /etc/cron.d/hc-map-backup; \
    touch /var/log/cron.log

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["cron", "-f", "-L", "15"]
