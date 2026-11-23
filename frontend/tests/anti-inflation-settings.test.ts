import test from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../src/lib/api/client";
import { errorMessage } from "../src/lib/errors";
import {
  defaultSystemSettingsInput,
  SYSTEM_SETTINGS_FIELDS,
  SYSTEM_SETTINGS_GROUPS,
} from "../src/forms/settings/settings-form";

test("SYSTEM_SETTINGS_GROUPS exposes all anti-inflation limits with sane defaults", () => {
  const keys = new Set(SYSTEM_SETTINGS_FIELDS.map((f) => f.key));
  for (const requiredKey of [
    "maxActiveClubs",
    "chatMessagesPerMinute",
    "clubStorageQuotaMb",
    "documentMaxVersions",
    "maxChannelsPerClub",
    "maxDepartmentsPerClub",
    "maxActiveEventsPerClub",
    "maxOpenTasksPerClub",
    "broadcastCooldownMinutes",
    "facebookSyncCooldownMinutes",
  ]) {
    assert.ok(keys.has(requiredKey as never), `Missing system setting field: ${requiredKey}`);
  }

  const defaults = defaultSystemSettingsInput();
  assert.equal(defaults.maxActiveClubs, 5);
  assert.equal(defaults.clubStorageQuotaMb, 500);
  assert.equal(defaults.documentMaxVersions, 20);
  assert.equal(defaults.maxChannelsPerClub, 30);
  assert.equal(defaults.maxDepartmentsPerClub, 20);
  assert.equal(defaults.maxActiveEventsPerClub, 50);
  assert.equal(defaults.maxOpenTasksPerClub, 200);
  assert.equal(defaults.chatMessagesPerMinute, 20);
  assert.equal(defaults.broadcastCooldownMinutes, 5);
  assert.equal(defaults.facebookSyncCooldownMinutes, 2);
  assert.ok(SYSTEM_SETTINGS_GROUPS.some((g) => g.title.includes("Chống spam")));
  assert.ok(SYSTEM_SETTINGS_GROUPS.some((g) => g.title.includes("Hạn mức tài nguyên")));
});

test("errorMessage surfaces Vietnamese details and fallbacks for all anti-inflation codes", () => {
  const withServerDetail = new ApiError(
    "Bạn gửi tin nhắn quá nhanh (tối đa 20 tin/phút). Vui lòng thử lại sau 15 giây.",
    429,
    "CHAT_RATE_LIMIT_EXCEEDED"
  );
  assert.match(errorMessage(withServerDetail), /tối đa 20 tin\/phút/);

  for (const code of [
    "CHAT_UPLOAD_RATE_LIMIT_EXCEEDED",
    "BROADCAST_COOLDOWN_ACTIVE",
    "FACEBOOK_SYNC_COOLDOWN",
    "CLUB_STORAGE_QUOTA_EXCEEDED",
    "DOCUMENT_VERSION_LIMIT_REACHED",
    "CHAT_CHANNEL_LIMIT_REACHED",
    "DEPARTMENT_LIMIT_REACHED",
    "EVENT_LIMIT_REACHED",
    "TASK_LIMIT_REACHED",
  ]) {
    const fallback = new ApiError("English fallback", 409, code);
    const msg = errorMessage(fallback);
    assert.notEqual(msg, "English fallback", `Expected Vietnamese mapping for ${code}`);
    assert.ok(msg.length > 10);
  }
});
