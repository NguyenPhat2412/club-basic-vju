import assert from "node:assert/strict";
import test from "node:test";
import type { EventAttendance, EventRegistration } from "@/types/event/event.types";
import {
  buildAttendanceStatusMap,
  filterEventRegistrations,
} from "@/utils/event-participants";

const SAMPLE_REGISTRATIONS: EventRegistration[] = [
  {
    id: "reg-1",
    eventId: "ev-1",
    userId: "u-1",
    userFullName: "Nguyễn Minh Anh",
    studentCode: "21010012",
    userEmail: "21010012@st.vju.ac.vn",
    participantType: "MEMBER",
    eventRole: "Hậu cần",
    status: "REGISTERED",
    note: "Hỗ trợ check-in sảnh A",
    registeredAt: "2026-10-10T08:00:00Z",
  },
  {
    id: "reg-2",
    eventId: "ev-1",
    userId: "u-2",
    userFullName: "Đặng Quốc Bảo",
    studentCode: "22040088",
    userEmail: "bao.dang@st.vju.ac.vn",
    participantType: "CTV",
    eventRole: "Truyền thông",
    status: "REGISTERED",
    note: "Chụp ảnh sự kiện",
    registeredAt: "2026-10-10T09:15:00Z",
  },
  {
    id: "reg-3",
    eventId: "ev-1",
    userId: "u-3",
    userFullName: "Trần Thuỳ Linh",
    studentCode: "23020045",
    userEmail: "linh.tran@st.vju.ac.vn",
    participantType: "MEMBER",
    eventRole: "MC dẫn chương trình",
    status: "CANCELLED",
    note: "Bận lịch thi giữa kỳ",
    registeredAt: "2026-10-10T10:00:00Z",
    cancelledAt: "2026-10-11T07:30:00Z",
  },
];

const SAMPLE_ATTENDANCES: EventAttendance[] = [
  {
    id: "att-1",
    eventId: "ev-1",
    userId: "u-1",
    status: "PRESENT",
    version: 1,
    checkedBy: "admin-1",
    checkedAt: "2026-10-15T08:30:00Z",
  },
  {
    id: "att-2",
    eventId: "ev-1",
    userId: "u-2",
    status: "LATE",
    version: 1,
    checkedBy: "admin-1",
    checkedAt: "2026-10-15T08:45:00Z",
  },
  {
    id: "att-2-v2",
    eventId: "ev-1",
    userId: "u-2",
    status: "PRESENT",
    editReason: "Cập nhật xác nhận đến đúng giờ",
    version: 2,
    checkedBy: "admin-1",
    checkedAt: "2026-10-15T09:00:00Z",
  },
];

test("filterEventRegistrations searches Vietnamese names, student codes, emails, roles, and notes case-insensitively", () => {
  assert.deepEqual(
    filterEventRegistrations(SAMPLE_REGISTRATIONS, "nguyễn minh", "ALL").map((r) => r.id),
    ["reg-1"],
  );
  assert.deepEqual(
    filterEventRegistrations(SAMPLE_REGISTRATIONS, "dang quoc", "ALL").map((r) => r.id),
    ["reg-2"],
  );
  assert.deepEqual(
    filterEventRegistrations(SAMPLE_REGISTRATIONS, "22040088", "ALL").map((r) => r.id),
    ["reg-2"],
  );
  assert.deepEqual(
    filterEventRegistrations(SAMPLE_REGISTRATIONS, "LINH.TRAN@ST.VJU.AC.VN", "ALL").map((r) => r.id),
    ["reg-3"],
  );
  assert.deepEqual(
    filterEventRegistrations(SAMPLE_REGISTRATIONS, "hậu cần", "ALL").map((r) => r.id),
    ["reg-1"],
  );
  assert.deepEqual(
    filterEventRegistrations(SAMPLE_REGISTRATIONS, "check-in", "ALL").map((r) => r.id),
    ["reg-1"],
  );
});

test("filterEventRegistrations filters by ALL, REGISTERED, CANCELLED and returns empty when unmatched", () => {
  assert.equal(filterEventRegistrations(SAMPLE_REGISTRATIONS, "", "ALL").length, 3);
  assert.deepEqual(
    filterEventRegistrations(SAMPLE_REGISTRATIONS, "", "REGISTERED").map((r) => r.id),
    ["reg-1", "reg-2"],
  );
  assert.deepEqual(
    filterEventRegistrations(SAMPLE_REGISTRATIONS, "", "CANCELLED").map((r) => r.id),
    ["reg-3"],
  );
  assert.deepEqual(
    filterEventRegistrations(SAMPLE_REGISTRATIONS, "trần thuỳ linh", "REGISTERED"),
    [],
  );
  assert.deepEqual(
    filterEventRegistrations(SAMPLE_REGISTRATIONS, "không tồn tại", "ALL"),
    [],
  );
});

test("buildAttendanceStatusMap indexes attendances by userId for O(1) lookup and prefers latest version", () => {
  const map = buildAttendanceStatusMap(SAMPLE_ATTENDANCES);
  assert.equal(map.size, 2);
  assert.equal(map.get("u-1")?.status, "PRESENT");
  assert.equal(map.get("u-2")?.status, "PRESENT");
  assert.equal(map.get("u-2")?.version, 2);
  assert.equal(map.get("u-3"), undefined);

  assert.equal(buildAttendanceStatusMap([]).size, 0);
  assert.equal(buildAttendanceStatusMap().size, 0);
});
