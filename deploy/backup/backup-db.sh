#!/usr/bin/env bash
# Dumps the production database to /srv/vju-club/backups/db and prunes old dumps.
# Runs from cron (deploy/backup/vju-club-backup.cron); safe to run by hand at any time.
#   daily/  one dump per run, kept KEEP_DAILY_DAYS days
#   weekly/ the Sunday dump, kept KEEP_WEEKLY_DAYS days
set -euo pipefail
umask 077

BACKUP_DIR=${BACKUP_DIR:-/srv/vju-club/backups/db}
KEEP_DAILY_DAYS=${KEEP_DAILY_DAYS:-14}
KEEP_WEEKLY_DAYS=${KEEP_WEEKLY_DAYS:-56}
MIN_FREE_MB=${MIN_FREE_MB:-1024}

log() { echo "$(date '+%F %T') $*"; }

container=$(docker ps -q -f label=com.docker.compose.project=vju-club -f label=com.docker.compose.service=postgres)
[ -n "$container" ] || { log "ERROR postgres container is not running"; exit 1; }

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"
free_mb=$(df -Pm "$BACKUP_DIR" | awk 'NR==2 {print $4}')
[ "$free_mb" -ge "$MIN_FREE_MB" ] || { log "ERROR only ${free_mb}MB free in $BACKUP_DIR"; exit 1; }

name="club-$(date '+%Y%m%d-%H%M%S').dump"
partial="$BACKUP_DIR/daily/.$name.partial"
trap 'rm -f "$partial"' EXIT

docker exec "$container" pg_dump -U club -d club --format=custom --compress=9 --no-owner > "$partial"
docker exec -i "$container" pg_restore --list > /dev/null < "$partial" \
  || { log "ERROR dump $name is not readable by pg_restore"; exit 1; }
mv "$partial" "$BACKUP_DIR/daily/$name"
trap - EXIT

if [ "$(date '+%u')" = 7 ]; then
  cp "$BACKUP_DIR/daily/$name" "$BACKUP_DIR/weekly/$name"
fi

find "$BACKUP_DIR/daily" -name 'club-*.dump' -mtime +"$KEEP_DAILY_DAYS" -delete
find "$BACKUP_DIR/weekly" -name 'club-*.dump' -mtime +"$KEEP_WEEKLY_DAYS" -delete

log "OK $name $(du -h "$BACKUP_DIR/daily/$name" | cut -f1)"
