#!/usr/bin/env bash
# Runs a collection against a running backend.
# Usage: docs/api/postman/run.sh auth|documents [baseUrl]
# Admin credentials: ADMIN_EMAIL/ADMIN_PASSWORD from the environment, else BOOTSTRAP_ADMIN_* from
# backend/springboot/.env.local, else the shared local admin. Nothing is printed.
set -euo pipefail
cd "$(dirname "$0")"
NAME=${1:?usage: run.sh auth|documents [baseUrl]}
if [ -f ../../../backend/springboot/.env.local ]; then set -a; . ../../../backend/springboot/.env.local; set +a; fi
postman collection run "$NAME.postman_collection.json" \
  --env-var "baseUrl=${2:-http://localhost:8080}" \
  --env-var "adminEmail=${ADMIN_EMAIL:-${BOOTSTRAP_ADMIN_EMAIL:-admin123@gmail.com}}" \
  --env-var "adminPassword=${ADMIN_PASSWORD:-${BOOTSTRAP_ADMIN_PASSWORD:-Admin123@}}"
