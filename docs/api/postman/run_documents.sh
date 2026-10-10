#!/usr/bin/env bash
# Runs the documents collection against a running backend. Admin credentials come from
# backend/springboot/.env.local when set there, else the shared local admin. Usage: ./run_documents.sh [baseUrl]
set -euo pipefail
cd "$(dirname "$0")"
if [ -f ../../../backend/springboot/.env.local ]; then set -a; . ../../../backend/springboot/.env.local; set +a; fi
postman collection run documents.postman_collection.json \
  --env-var "baseUrl=${1:-http://localhost:8080}" \
  --env-var "adminEmail=${BOOTSTRAP_ADMIN_EMAIL:-admin123@gmail.com}" \
  --env-var "adminPassword=${BOOTSTRAP_ADMIN_PASSWORD:-Admin123@}"
