#!/usr/bin/env bash
# Ships the committed tree of a git ref to the VPS and (re)starts the stack there.
# Usage: deploy/deploy.sh [user@host] [git-ref]     (defaults: root@160.22.123.184 main)
# Needs SSH key access to the host and /srv/vju-club/deploy/.env present on it.
set -euo pipefail
HOST=${1:-root@160.22.123.184}
REF=${2:-main}
APP=/srv/vju-club
cd "$(git rev-parse --show-toplevel)"
echo "Deploying $(git rev-parse --short "$REF") to $HOST:$APP"
ssh "$HOST" "mkdir -p $APP/releases && test -f $APP/deploy/.env || { echo 'missing $APP/deploy/.env' >&2; exit 1; }"
git archive --format=tar "$REF" | ssh "$HOST" "rm -rf $APP/releases/next && mkdir -p $APP/releases/next && tar -x -C $APP/releases/next"
ssh "$HOST" "set -e
  cp $APP/deploy/.env $APP/releases/next/deploy/.env
  cd $APP/releases/next/deploy
  docker compose -f compose.prod.yml --env-file .env build
  docker compose -f compose.prod.yml --env-file .env up -d --remove-orphans
  cd $APP/releases && rm -rf previous && { [ -d current ] && mv current previous || true; } && mv next current
  docker compose -f $APP/releases/current/deploy/compose.prod.yml --env-file $APP/deploy/.env ps"
