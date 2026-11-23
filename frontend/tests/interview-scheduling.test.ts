import assert from "node:assert/strict";
import test from "node:test";
import type { ApplicationSummary } from "@/types/application/application.types";
import {
  extractUpcomingInterviews,
  formatInterviewCountdown,
  formatInterviewReminderLabel,
  fromDateTimeLocalInput,
  toDateTimeLocalInput,
} from "@/forms/application/interview-scheduling";

const NOW = Date.parse("2026-11-22T10:00:00.000Z");

function makeApp(overrides: Partial<ApplicationSummary>): ApplicationSummary {
  return {
    id: overrides.id ?? "app-1",
    clubId: "club-1",
    clubCode: "VJUT",
    clubName: overrides.clubName ?? "CLB Công nghệ VJU",
    status: overrides.status ?? "PENDING",
    createdAt: "2026-11-20T08:00:00.000Z",
    ...overrides,
  };
}

test("extractUpcomingInterviews filters out past, missing, REJECTED, and CANCELLED entries and sorts ascending", () => {
  const apps: ApplicationSummary[] = [
    makeApp({
      id: "later",
      clubName: "CLB Trễ hơn",
      status: "APPROVED",
      interviewAt: "2026-11-25T14:00:00.000Z",
      interviewLocation: "Hội trường A1",
    }),
    makeApp({
      id: "no-interview",
      status: "PENDING",
    }),
    makeApp({
      id: "past",
      status: "PENDING",
      interviewAt: "2026-11-21T09:00:00.000Z",
      interviewLocation: "Phòng B101",
    }),
    makeApp({
      id: "rejected",
      status: "REJECTED",
      interviewAt: "2026-11-24T09:00:00.000Z",
      interviewLocation: "Phòng B102",
    }),
    makeApp({
      id: "cancelled",
      status: "CANCELLED",
      interviewAt: "2026-11-24T10:00:00.000Z",
      interviewLocation: "Phòng B103",
    }),
    makeApp({
      id: "earliest",
      clubName: "CLB Sớm nhất",
      status: "PENDING",
      interviewAt: "2026-11-23T08:30:00.000Z",
      interviewLocation: "https://meet.google.com/abc-defg-hij",
    }),
  ];

  const upcoming = extractUpcomingInterviews(apps, NOW);
  assert.deepEqual(
    upcoming.map((a) => a.id),
    ["earliest", "later"],
  );
});

test("formatInterviewReminderLabel handles empty, invalid, and valid ISO timestamps", () => {
  assert.equal(formatInterviewReminderLabel(undefined), "Chưa gửi nhắc lịch hẹn");
  assert.equal(formatInterviewReminderLabel(null), "Chưa gửi nhắc lịch hẹn");
  assert.equal(formatInterviewReminderLabel("not-a-date"), "Chưa gửi nhắc lịch hẹn");

  const label = formatInterviewReminderLabel("2026-11-22T09:30:00.000Z");
  assert.ok(label.startsWith("Đã nhắc hẹn gần nhất: "), `Unexpected label: ${label}`);
  assert.ok(label.length > "Đã nhắc hẹn gần nhất: ".length);
});

test("formatInterviewCountdown returns readable Vietnamese countdowns", () => {
  assert.equal(formatInterviewCountdown("2026-11-22T09:00:00.000Z", NOW), "Đã qua");
  assert.equal(formatInterviewCountdown("2026-11-22T10:30:00.000Z", NOW), "Trong 30 phút");
  assert.equal(formatInterviewCountdown("2026-11-22T15:00:00.000Z", NOW), "Trong 5 giờ");
  assert.equal(formatInterviewCountdown("2026-11-23T10:00:00.000Z", NOW), "Ngày mai");
  assert.equal(formatInterviewCountdown("2026-11-25T10:00:00.000Z", NOW), "Còn 3 ngày");
});

test("toDateTimeLocalInput and fromDateTimeLocalInput round-trip valid timestamps and reject invalid ones", () => {
  assert.equal(toDateTimeLocalInput(null), "");
  assert.equal(toDateTimeLocalInput("invalid"), "");
  assert.equal(fromDateTimeLocalInput("   "), null);
  assert.equal(fromDateTimeLocalInput("not-a-date"), null);

  const original = "2026-11-24T09:15:00.000Z";
  const local = toDateTimeLocalInput(original);
  assert.match(local, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  const backToIso = fromDateTimeLocalInput(local);
  assert.equal(backToIso, original);
});
