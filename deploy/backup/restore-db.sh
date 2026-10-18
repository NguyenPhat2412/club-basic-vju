#!/usr/bin/env bash
# Restores a dump made by backup-db.sh.
# Usage:
#   restore-db.sh <dump> --check   restore into a throwaway database, print row counts, drop it
#   restore-db.sh <dump> --replace stop the backend, replace the live database, start the backend
set -euo pipefail

dump=${1:?usage: restore-db.sh <dump> --check|--replace}
mode=${2:?usage: restore-db.sh <dump> --check|--replace}
[ -f "$dump" ] || { echo "no such file: $dump" >&2; exit 1; }

container=$(docker ps -q -f label=com.docker.compose.project=vju-club -f label=com.docker.compose.service=postgres)
[ -n "$container" ] || { echo "postgres container is not running" >&2; exit 1; }
psql() { docker exec -i "$container" psql -U club -v ON_ERROR_STOP=1 "$@"; }

case "$mode" in
  --check)
    db=restore_check_$$
    trap 'psql -d postgres -qc "DROP DATABASE IF EXISTS $db" || true' EXIT
    psql -d postgres -qc "CREATE DATABASE $db"
    docker exec -i "$container" pg_restore -U club -d "$db" --no-owner --exit-on-error < "$dump"
    psql -d "$db" -Atc "SELECT 'users', count(*) FROM users UNION ALL SELECT 'clubs', count(*) FROM clubs
      UNION ALL SELECT 'memberships', count(*) FROM memberships UNION ALL SELECT 'documents', count(*) FROM documents
      UNION ALL SELECT 'flyway', max(version::int) FROM flyway_schema_history WHERE success"
    ;;
  --replace)
    read -r -p "Replace the LIVE database with $(basename "$dump")? Type the word restore: " answer
    [ "$answer" = restore ] || { echo "aborted"; exit 1; }
    "$(dirname "$0")/backup-db.sh"
    backend=$(docker ps -q -f label=com.docker.compose.project=vju-club -f label=com.docker.compose.service=backend)
    [ -z "$backend" ] || docker stop "$backend"
    psql -d postgres -qc "DROP DATABASE club WITH (FORCE)"
    psql -d postgres -qc "CREATE DATABASE club OWNER club"
    docker exec -i "$container" pg_restore -U club -d club --no-owner --exit-on-error < "$dump"
    [ -z "$backend" ] || docker start "$backend"
    echo "restored $(basename "$dump"); a dump of the replaced database was taken first"
    ;;
  *) echo "mode must be --check or --replace" >&2; exit 1 ;;
esac
