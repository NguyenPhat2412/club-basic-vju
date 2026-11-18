#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QA_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TARGET="${1:-all}"
shift || true

LIVE_URL=""
CODE_REPO=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --live)
      LIVE_URL="${2:-}"
      shift 2
      ;;
    --repo)
      CODE_REPO="${2:-}"
      shift 2
      ;;
    *)
      echo "Tham số không hợp lệ: $1"
      echo "Cách dùng: ./testcases/run-sprint-tests.sh [sprint-1|sprint-2|sprint-3|sprint-4|contract|all] [--live URL] [--repo PATH]"
      exit 1
      ;;
  esac
done

normalize_target() {
  case "$1" in
    1|s1|sprint1|sprint-1|"sprint 1") echo "sprint-1" ;;
    2|s2|sprint2|sprint-2|"sprint 2") echo "sprint-2" ;;
    3|s3|sprint3|sprint-3|"sprint 3") echo "sprint-3" ;;
    4|s4|sprint4|sprint-4|"sprint 4") echo "sprint-4" ;;
    contract|api) echo "contract" ;;
    all) echo "all" ;;
    *)
      echo "Không nhận diện được mục tiêu '$1' (chọn: sprint-1, sprint-2, sprint-3, sprint-4, contract, all)" >&2
      exit 1
      ;;
  esac
}

NORM="$(normalize_target "$TARGET")"

run_one_sprint() {
  local sp="$1"
  local sp_upper
  sp_upper="$(printf '%s' "$sp" | tr '[:lower:]' '[:upper:]')"
  echo "=================================================================="
  echo "▶ ĐANG CHẠY BỘ TEST NHANH CHO: $sp_upper"
  echo "=================================================================="
  LIVE_API_URL="$LIVE_URL" python3 -m unittest discover -s "$SCRIPT_DIR/$sp" -p "test_*.py" -v

  if [[ -n "$CODE_REPO" ]]; then
    echo "------------------------------------------------------------------"
    echo "▶ Chạy Unit & Integration Tests trên mã nguồn ($CODE_REPO) cho $sp"
    echo "------------------------------------------------------------------"
    case "$sp" in
      sprint-1)
        BE_TESTS="SprintOneAcceptanceTest,AuthApiTest,GoogleSignInApiTest,UserApiTest,ClubApiTest,DepartmentApiTest,MembershipApiTest,PermissionApiTest,PermissionBulkApiTest,RoleApiTest,AuditLogApiTest"
        FE_TESTS="tests/auth-form.test.ts tests/user-access-draft.test.ts tests/query-keys.test.ts"
        ;;
      sprint-2)
        BE_TESTS="PhaseTwoAcceptanceTest,PhaseTwoMigrationTest,SprintTwoMembershipAcceptanceTest,SprintTwoNotificationAndHardeningAcceptanceTest,ClubApplicationApiTest,DepartmentMemberApiTest,NotificationApiTest,PublicEndpointApiTest"
        FE_TESTS="tests/sprint2.test.ts tests/file-size-limit.test.ts"
        ;;
      sprint-3)
        BE_TESTS="PhaseThreeAcceptanceTest,PhaseThreeOperationsApiTest,FlowHardeningApiTest,AuthApiTest"
        FE_TESTS="tests/phase34.test.ts tests/auth-form.test.ts tests/color-system-60-30-10.test.ts"
        ;;
      sprint-4)
        BE_TESTS="PhaseFourAcceptanceTest,DocumentThreeTierAccessTest,GoogleDriveDocumentStorageTest,ChatWebSocketIntegrationTest,ChatMediaAndQuickReplyTest,NotificationRealtimeAndChatUnitTest,SystemSettingsApiTest,UserAvatarApiTest,SecurityAndInputBoundsTest,OtpMailTemplateBuilderTest,ProdProfileStartupTest"
        FE_TESTS="tests/realtime-vault.test.ts tests/realtime-notifications.test.ts tests/chat-message-status.test.ts tests/chat-tta-media-cache.test.ts tests/i18n-home.test.ts tests/table-filter-views.test.ts tests/security-input-bounds.test.ts tests/club-overview-config.test.ts tests/form-field-meta.test.ts tests/workspace-tabs.test.ts"
        ;;
    esac
    (cd "$CODE_REPO/frontend" && node --import ./tests/register-alias.mjs --test $FE_TESTS)
    (cd "$CODE_REPO/backend/springboot" && ./mvnw test -Dtest="$BE_TESTS")
  fi
}

if [[ "$NORM" == "contract" ]]; then
  python3 -m unittest discover -s "$QA_ROOT/docs/api/tests" -v
elif [[ "$NORM" == "all" ]]; then
  python3 -m unittest discover -s "$QA_ROOT/docs/api/tests" -v
  for s in sprint-1 sprint-2 sprint-3 sprint-4; do
    run_one_sprint "$s"
  done
else
  run_one_sprint "$NORM"
fi

echo "✅ Hoàn tất kiểm thử mục tiêu: $NORM"
