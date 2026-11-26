#!/usr/bin/env bash
# Lightweight VJU ClubHub VPS health & resource watchdog.
# Cron example (every 5 minutes):
#   */5 * * * * /srv/vju-club/releases/current/deploy/monitoring/healthcheck.sh >> /var/log/vju-health.log 2>&1
# Optional Telegram alerts: export TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=...
set -euo pipefail

DISK_WARN_PCT=${DISK_WARN_PCT:-85}
MEM_WARN_PCT=${MEM_WARN_PCT:-88}
URLS=(
  "https://vju-club.all1.vn/"
  "https://vju-club.all1.vn/api/v1/api-catalog"
  "https://staging.vju-club.all1.vn/"
  "https://staging.vju-club.all1.vn/api/v1/api-catalog"
)

issues=()

for url in "${URLS[@]}"; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 8 "$url" || echo "000")
  if [[ "$code" != "200" && "$code" != "401" ]]; then
    issues+=("HTTP $code on $url")
  fi
done

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  unhealthy=$(docker ps --filter "name=vju-club" --format "{{.Names}} {{.Status}}" | grep -E "unhealthy|Restarting" || true)
  if [[ -n "$unhealthy" ]]; then
    issues+=("Docker issue: $unhealthy")
  fi
fi

disk_pct=$(df -P / | awk 'NR==2 {gsub("%",""); print $5}')
if [[ -n "$disk_pct" && "$disk_pct" -ge "$DISK_WARN_PCT" ]]; then
  issues+=("Root disk usage high: ${disk_pct}% >= ${DISK_WARN_PCT}%")
fi

if command -v free >/dev/null 2>&1; then
  mem_pct=$(free | awk '/Mem:/ {printf "%d", ($3/$2)*100}')
  if [[ -n "$mem_pct" && "$mem_pct" -ge "$MEM_WARN_PCT" ]]; then
    issues+=("Memory usage high: ${mem_pct}% >= ${MEM_WARN_PCT}%")
  fi
fi

ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
if [[ ${#issues[@]} -eq 0 ]]; then
  echo "$ts OK disk=${disk_pct}% mem=${mem_pct:-n/a}%"
  exit 0
fi

msg="[$ts] VJU ClubHub ALERT on $(hostname):"$'\n'"$(printf ' - %s\n' "${issues[@]}")"
echo "$msg" >&2

if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
  curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${msg}" >/dev/null || true
fi

exit 1
